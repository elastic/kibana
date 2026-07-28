/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
  type EuiInMemoryTableProps,
  type EuiSearchBarOnChangeArgs,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInMemoryTable,
  EuiPanel,
  EuiRadioGroup,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UseField, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ConnectorActionDef } from '../apis/fetch_connector_spec';

const SELECTED_ACTIONS_FIELD = 'config.selectedActions';
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const MODE_ALL = 'all';
const MODE_SPECIFIC = 'specific';

const RADIO_OPTIONS = [
  {
    id: MODE_ALL,
    label: i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.allActionsLabel', {
      defaultMessage: 'All actions',
    }),
  },
  {
    id: MODE_SPECIFIC,
    label: i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.specificActionsLabel', {
      defaultMessage: 'Specific actions',
    }),
  },
];

export interface ConnectorActionSelectorProps {
  actions: ConnectorActionDef[];
  readOnly?: boolean;
}

// null is the "all actions" sentinel — the es-ui-shared form library substitutes
// '' for undefined, and the serializer strips null before saving.
export const ConnectorActionSelector: React.FC<ConnectorActionSelectorProps> = ({
  actions,
  readOnly = false,
}) => {
  const form = useFormContext();
  // Read the form's reset value so the edit case initializes correctly.
  const formDefault = form.getFieldDefaultValue<string[] | null | undefined>(
    SELECTED_ACTIONS_FIELD
  );
  // UseField falls back to '' for undefined, which breaks array operations.
  // Use null as the "all actions" sentinel instead.
  const defaultValue = formDefault !== undefined ? formDefault : null;

  const allActionNames = useMemo(() => actions.map((a) => a.name), [actions]);

  return (
    <UseField<string[] | null> path={SELECTED_ACTIONS_FIELD} defaultValue={defaultValue}>
      {(field) => (
        <ConnectorActionSelectorUI
          field={field}
          actions={actions}
          allActionNames={allActionNames}
          readOnly={readOnly}
        />
      )}
    </UseField>
  );
};

interface SelectedActionsField {
  value: string[] | null;
  setValue: (value: string[] | null) => void;
}

interface UIProps {
  field: SelectedActionsField;
  actions: ConnectorActionDef[];
  allActionNames: string[];
  readOnly: boolean;
}

export const ConnectorActionSelectorUI: React.FC<UIProps> = ({
  field,
  actions,
  allActionNames,
  readOnly,
}) => {
  const rawSelected = field.value;
  const isAll = rawSelected === null;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState<EuiSearchBarOnChangeArgs['query']>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredActions = useMemo(
    () =>
      searchQuery
        ? EuiSearchBar.Query.execute(searchQuery, actions, {
            defaultFields: ['name', 'description'],
          })
        : actions,
    [actions, searchQuery]
  );

  const sortedFilteredActions = useMemo(
    () =>
      [...filteredActions].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return sortDirection === 'asc' ? cmp : -cmp;
      }),
    [filteredActions, sortDirection]
  );

  const currentPageActions = useMemo(
    () => sortedFilteredActions.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [sortedFilteredActions, pageIndex, pageSize]
  );

  // handleSelectAll already set the correct value; skip EUI's reactive onSelectionChange.
  const isSelectAllActiveRef = useRef(false);

  // Refs keep callbacks stable; recreating them triggers EUI's componentDidUpdate → loop.
  const rawSelectedRef = useRef(rawSelected);
  rawSelectedRef.current = rawSelected;
  const currentPageActionsRef = useRef(currentPageActions);
  currentPageActionsRef.current = currentPageActions;

  const handleModeChange = useCallback(
    (id: string) => {
      if (id === MODE_ALL) {
        field.setValue(null);
      } else {
        // Default to all actions checked when entering specific mode.
        field.setValue(allActionNames);
      }
    },
    [allActionNames, field]
  );

  const handleSelectionChange = useCallback(
    (newItems: ConnectorActionDef[]) => {
      // Ignore the page-clamped second call that follows a select-all.
      if (isSelectAllActiveRef.current && newItems.length < actions.length) {
        isSelectAllActiveRef.current = false;
        return;
      }
      isSelectAllActiveRef.current = false;
      const currentPageNames = new Set(currentPageActionsRef.current.map((a) => a.name));
      const offPageSelected = (rawSelectedRef.current ?? []).filter(
        (n) => !currentPageNames.has(n)
      );
      field.setValue([...offPageSelected, ...newItems.map((a) => a.name)]);
    },
    [actions.length, field]
  );

  const handleSelectAll = useCallback(() => {
    isSelectAllActiveRef.current = true;
    field.setValue([...allActionNames]);
  }, [allActionNames, field]);

  const handleClearSelection = useCallback(() => {
    field.setValue([]);
  }, [field]);

  // Restrict to current page: getDerivedStateFromProps fires onSelectionChange for
  // any selected item absent from items, which would wipe off-page selections.
  const selectedCurrentPageItems = useMemo(() => {
    const selectedSet = new Set(rawSelected ?? []);
    return currentPageActions.filter((a) => selectedSet.has(a.name));
  }, [currentPageActions, rawSelected]);

  const selection: EuiInMemoryTableProps<ConnectorActionDef>['selection'] = useMemo(
    () => ({
      selectable: () => !readOnly,
      onSelectionChange: handleSelectionChange,
      selected: selectedCurrentPageItems,
    }),
    [readOnly, handleSelectionChange, selectedCurrentPageItems]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ConnectorActionDef>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.actionColumnName', {
          defaultMessage: 'Action',
        }),
        sortable: true,
        render: (name: string, action: ConnectorActionDef) => (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{name}</strong>
              </EuiText>
            </EuiFlexItem>
            {action.description && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {action.description}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
    ],
    []
  );

  const selectedCount = (rawSelected ?? []).length;
  const totalFiltered = filteredActions.length;
  const paginationStart = totalFiltered > 0 ? pageIndex * pageSize + 1 : 0;
  const paginationEnd = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const tableHeader =
    actions.length > 0 ? (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow>
          {totalFiltered > 0 && (
            <EuiText size="xs" color="subdued">
              {i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.showingCount', {
                defaultMessage: 'Showing {start}–{end} of {total}',
                values: { start: paginationStart, end: paginationEnd, total: totalFiltered },
              })}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="pagesSelect"
            iconSide="left"
            onClick={handleSelectAll}
            disabled={readOnly}
            data-test-subj="connectorActionSelectorSelectAll"
          >
            {i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.selectAll', {
              defaultMessage: 'Select all',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {selectedCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.selectedCount', {
                    defaultMessage: '{count} selected',
                    values: { count: selectedCount },
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="cross"
                  iconSide="left"
                  color="danger"
                  onClick={handleClearSelection}
                  disabled={readOnly}
                  data-test-subj="connectorActionSelectorClearSelection"
                >
                  {i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.clearSelection', {
                    defaultMessage: 'Clear selection',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ) : null;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('kbn-alerts-ui-shared.connectorActionSelector.allowedActionsLabel', {
          defaultMessage: 'Allowed actions',
        })}
      >
        <EuiRadioGroup
          options={RADIO_OPTIONS}
          idSelected={isAll ? MODE_ALL : MODE_SPECIFIC}
          onChange={handleModeChange}
          disabled={readOnly}
          name="connectorActionSelectorMode"
          data-test-subj="connectorActionSelectorMode"
        />
      </EuiFormRow>
      {!isAll && actions.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiInMemoryTable
              items={actions}
              columns={columns}
              itemId="name"
              selection={selection}
              search={{
                box: {
                  incremental: true,
                  placeholder: i18n.translate(
                    'kbn-alerts-ui-shared.connectorActionSelector.searchPlaceholder',
                    { defaultMessage: 'Search actions' }
                  ),
                },
                onChange: ({ query, error }: EuiSearchBarOnChangeArgs) => {
                  if (!error) {
                    setSearchQuery(query);
                    setPageIndex(0);
                  }
                },
              }}
              onTableChange={({ page, sort }: CriteriaWithPagination<ConnectorActionDef>) => {
                // EuiBasicTable clears selection before firing onChange on page/sort changes.
                // Capture now and restore below; React batches both calls so this one wins.
                const selectionToRestore = rawSelectedRef.current;
                if (sort) {
                  setSortDirection(sort.direction);
                }
                if (page) {
                  if (page.size !== pageSize) {
                    setPageSize(page.size);
                    setPageIndex(0);
                  } else {
                    setPageIndex(page.index);
                  }
                }
                field.setValue(selectionToRestore);
              }}
              pagination={{
                initialPageSize: DEFAULT_PAGE_SIZE,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                showPerPageOptions: true,
                pageIndex,
                pageSize,
              }}
              sorting={{ sort: { field: 'name', direction: sortDirection } }}
              childrenBetween={tableHeader}
              rowProps={(item) => ({
                'data-test-subj': `connectorActionSelectorRow-${item.name}`,
              })}
              tableCaption={i18n.translate(
                'kbn-alerts-ui-shared.connectorActionSelector.tableCaption',
                { defaultMessage: 'Connector actions' }
              )}
              data-test-subj="connectorActionSelectorTable"
            />
          </EuiPanel>
        </>
      )}
    </>
  );
};
