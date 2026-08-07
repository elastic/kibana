/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { ConnectorActionDef } from '../apis/fetch_connector_spec';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const MODES = { RECOMMENDED: 'recommended', SPECIFIC: 'specific' } as const;

const RADIO_OPTIONS = [
  {
    id: MODES.RECOMMENDED,
    label: i18n.translate('alertsUIShared.connectorActionSelector.allActionsLabel', {
      defaultMessage: 'Recommended actions',
    }),
    labelProps: { 'data-test-subj': 'connectorActionSelectorModeRecommended' },
  },
  {
    id: MODES.SPECIFIC,
    label: i18n.translate('alertsUIShared.connectorActionSelector.specificActionsLabel', {
      defaultMessage: 'Specific actions',
    }),
    labelProps: { 'data-test-subj': 'connectorActionSelectorModeSpecific' },
  },
];

export interface ConnectorActionSelectorProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  actions: ConnectorActionDef[];
  readOnly?: boolean;
}

// null = "recommended (isTool) actions" sentinel; serializer strips it before saving.
export const ConnectorActionSelector: React.FC<ConnectorActionSelectorProps> = ({
  value: rawSelected,
  onChange,
  actions,
  readOnly = false,
}) => {
  const isRecommended = rawSelected === null;

  const allActionNames = useMemo(() => actions.map((a) => a.name), [actions]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState<EuiSearchBarOnChangeArgs['query']>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const recommendedActionNames = useMemo(
    () => actions.filter((a) => a.isTool).map((a) => a.name),
    [actions]
  );

  // Remember the last non-empty specific selection so toggling modes does not wipe it.
  const previousSpecificRef = useRef<string[] | null>(
    Array.isArray(rawSelected) && rawSelected.length > 0 ? rawSelected : null
  );
  useEffect(() => {
    if (Array.isArray(rawSelected) && rawSelected.length > 0) {
      previousSpecificRef.current = rawSelected;
    }
  }, [rawSelected]);

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
      setSearchQuery(null);
      setPageIndex(0);
      if (id === MODES.RECOMMENDED) {
        onChange(null);
      } else {
        onChange(previousSpecificRef.current ?? recommendedActionNames);
      }
    },
    [recommendedActionNames, onChange]
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
      onChange([...offPageSelected, ...newItems.map((a) => a.name)]);
    },
    [actions.length, onChange]
  );

  const handleSelectAll = useCallback(() => {
    isSelectAllActiveRef.current = true;
    onChange([...allActionNames]);
  }, [allActionNames, onChange]);

  const handleClearSelection = useCallback(() => {
    onChange([]);
  }, [onChange]);

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
        name: i18n.translate('alertsUIShared.connectorActionSelector.actionColumnName', {
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
  const emptySpecificSelection = !isRecommended && selectedCount === 0;
  const totalFiltered = filteredActions.length;
  const paginationStart = totalFiltered > 0 ? pageIndex * pageSize + 1 : 0;
  const paginationEnd = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  const tableHeader =
    actions.length > 0 ? (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow>
          {totalFiltered > 0 && (
            <EuiText size="xs" color="subdued">
              {i18n.translate('alertsUIShared.connectorActionSelector.showingCount', {
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
            {i18n.translate('alertsUIShared.connectorActionSelector.selectAll', {
              defaultMessage: 'Select all',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {selectedCount > 0 && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {i18n.translate('alertsUIShared.connectorActionSelector.selectedCount', {
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
                  {i18n.translate('alertsUIShared.connectorActionSelector.clearSelection', {
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
        label={i18n.translate('alertsUIShared.connectorActionSelector.allowedActionsLabel', {
          defaultMessage: 'Allowed actions',
        })}
        helpText={i18n.translate('alertsUIShared.connectorActionSelector.helpText', {
          defaultMessage:
            'Recommended actions are those marked for automated use. Choose specific actions to allow a custom set, ' +
            'including actions that require user confirmation.',
        })}
      >
        <EuiRadioGroup
          options={RADIO_OPTIONS}
          idSelected={isRecommended ? MODES.RECOMMENDED : MODES.SPECIFIC}
          onChange={handleModeChange}
          disabled={readOnly}
          name="connectorActionSelectorMode"
          data-test-subj="connectorActionSelectorMode"
        />
      </EuiFormRow>
      {!isRecommended && actions.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFormRow
            isInvalid={emptySpecificSelection}
            error={
              emptySpecificSelection
                ? i18n.translate('alertsUIShared.connectorActionSelector.emptySelectionError', {
                    defaultMessage: 'Select at least one action, or switch to recommended actions.',
                  })
                : undefined
            }
            fullWidth
          >
            <EuiPanel hasBorder paddingSize="m">
              <EuiInMemoryTable
                items={filteredActions}
                columns={columns}
                itemId="name"
                selection={selection}
                search={{
                  box: {
                    incremental: true,
                    placeholder: i18n.translate(
                      'alertsUIShared.connectorActionSelector.searchPlaceholder',
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
                  onChange(selectionToRestore);
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
                  'alertsUIShared.connectorActionSelector.tableCaption',
                  { defaultMessage: 'Connector actions' }
                )}
                data-test-subj="connectorActionSelectorTable"
              />
            </EuiPanel>
          </EuiFormRow>
        </>
      )}
    </>
  );
};
