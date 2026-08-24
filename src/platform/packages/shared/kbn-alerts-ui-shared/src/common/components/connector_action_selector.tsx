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
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionScope } from '@kbn/connector-specs';
import { resolveActionScope } from '@kbn/connector-specs';
import type { ConnectorActionDef } from '../apis/fetch_connector_spec';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const SCOPE_ORDER: ActionScope[] = ['read', 'write', 'destroy'];

const SCOPE_LABELS: Record<ActionScope, string> = {
  read: 'read',
  write: 'write',
  destroy: 'delete',
};

const SCOPE_BADGE_COLORS: Record<ActionScope, string> = {
  read: 'success',
  write: 'warning',
  destroy: 'danger',
};

const MODE_ALL = 'all';
const MODE_CUSTOM = 'custom';

const MODE_OPTIONS = [
  {
    id: MODE_ALL,
    label: i18n.translate('alertsUIShared.connectorActionSelector.modeAll', {
      defaultMessage: 'All',
    }),
  },
  {
    id: MODE_CUSTOM,
    label: i18n.translate('alertsUIShared.connectorActionSelector.modeCustom', {
      defaultMessage: 'Custom',
    }),
  },
];

export interface ConnectorActionSelectorProps {
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  actions: ConnectorActionDef[];
  readOnly?: boolean;
}

// null = "all actions" sentinel; serializer strips it before saving.
export const ConnectorActionSelector: React.FC<ConnectorActionSelectorProps> = ({
  value: rawSelected,
  onChange,
  actions,
  readOnly = false,
}) => {
  const isAll = rawSelected === null;

  const allActionNames = useMemo(() => actions.map((a) => a.name), [actions]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchText, setSearchText] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const presentScopes = useMemo(
    () => SCOPE_ORDER.filter((s) => actions.some((a) => resolveActionScope(a) === s)),
    [actions]
  );

  const actionsByScope = useMemo(() => {
    const groups: Partial<Record<ActionScope, ConnectorActionDef[]>> = {};
    for (const a of actions) {
      const scope = resolveActionScope(a);
      if (!groups[scope]) groups[scope] = [];
      groups[scope]!.push(a);
    }
    return groups;
  }, [actions]);

  const scopeCheckState = useMemo(() => {
    const selectedSet = new Set(rawSelected ?? []);
    const result: Partial<Record<ActionScope, 'checked' | 'indeterminate' | 'unchecked'>> = {};
    for (const scope of SCOPE_ORDER) {
      const scopeActions = actionsByScope[scope] ?? [];
      if (scopeActions.length === 0) continue;
      const n = scopeActions.filter((a) => selectedSet.has(a.name)).length;
      result[scope] =
        n === 0 ? 'unchecked' : n === scopeActions.length ? 'checked' : 'indeterminate';
    }
    return result;
  }, [rawSelected, actionsByScope]);

  const toggleScopeSelection = useCallback(
    (scope: ActionScope) => {
      const scopeNames = (actionsByScope[scope] ?? []).map((a) => a.name);
      const state = scopeCheckState[scope];
      const current = rawSelected ?? [];
      if (state === 'unchecked') {
        onChange([...new Set([...current, ...scopeNames])]);
      } else {
        const scopeSet = new Set(scopeNames);
        onChange(current.filter((n) => !scopeSet.has(n)));
      }
    },
    [actionsByScope, scopeCheckState, rawSelected, onChange]
  );

  const defaultReadActionNames = useMemo(
    () => actions.filter((a) => resolveActionScope(a) === 'read').map((a) => a.name),
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

  const filteredActions = useMemo(() => {
    if (!searchText) return actions;
    const lower = searchText.toLowerCase();
    return actions.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        (a.description?.toLowerCase().includes(lower) ?? false)
    );
  }, [actions, searchText]);

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

  const handleModeChange = useCallback(() => {
    setSearchText('');
    setPageIndex(0);
    if (isAll) {
      onChange(previousSpecificRef.current ?? defaultReadActionNames);
    } else {
      if (Array.isArray(rawSelected) && rawSelected.length > 0) {
        previousSpecificRef.current = rawSelected;
      }
      onChange(null);
    }
  }, [isAll, onChange, rawSelected, defaultReadActionNames]);

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

  const handleClearSelection = useCallback(() => onChange([]), [onChange]);

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
      {
        name: '',
        width: '90px',
        align: 'right' as const,
        render: (action: ConnectorActionDef) => {
          const scope = resolveActionScope(action);
          return <EuiBadge color={SCOPE_BADGE_COLORS[scope]}>{SCOPE_LABELS[scope]}</EuiBadge>;
        },
      },
    ],
    []
  );

  const selectedCount = (rawSelected ?? []).length;
  const emptySpecificSelection = !isAll && selectedCount === 0;
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
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexStart"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('alertsUIShared.connectorActionSelector.actionsLabel', {
                defaultMessage: 'Actions',
              })}
            </strong>
          </EuiText>
          {!isAll && (
            <EuiText size="xs" color="subdued">
              {i18n.translate('alertsUIShared.connectorActionSelector.actionCount', {
                defaultMessage: '{selected} of {total} actions',
                values: { selected: selectedCount, total: actions.length },
              })}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('alertsUIShared.connectorActionSelector.modeLegend', {
              defaultMessage: 'Action selection mode',
            })}
            options={MODE_OPTIONS}
            idSelected={isAll ? MODE_ALL : MODE_CUSTOM}
            onChange={(id) => {
              if ((id === MODE_ALL) !== isAll) handleModeChange();
            }}
            buttonSize="compressed"
            isDisabled={readOnly}
            data-test-subj="connectorActionSelectorMode"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {isAll ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('alertsUIShared.connectorActionSelector.allActionsHint', {
              defaultMessage: 'All actions are available to the agent.',
            })}
          </EuiText>
        </>
      ) : (
        actions.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow>
                <EuiFieldSearch
                  placeholder={i18n.translate(
                    'alertsUIShared.connectorActionSelector.filterPlaceholder',
                    { defaultMessage: 'Filter actions...' }
                  )}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setPageIndex(0);
                  }}
                  fullWidth
                  data-test-subj="connectorActionSelectorFilter"
                />
              </EuiFlexItem>
              {presentScopes.length > 1 &&
                presentScopes.map((scope) => (
                  <EuiFlexItem grow={false} key={scope}>
                    <EuiCheckbox
                      id={`connectorActionScopeSelect-${scope}`}
                      checked={scopeCheckState[scope] === 'checked'}
                      indeterminate={scopeCheckState[scope] === 'indeterminate'}
                      onChange={() => toggleScopeSelection(scope)}
                      disabled={readOnly}
                      label={
                        <EuiBadge color={SCOPE_BADGE_COLORS[scope]}>{SCOPE_LABELS[scope]}</EuiBadge>
                      }
                      data-test-subj={`connectorActionScopeSelect-${scope}`}
                    />
                  </EuiFlexItem>
                ))}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {tableHeader}
            <EuiSpacer size="xs" />
            <EuiFormRow
              isInvalid={emptySpecificSelection}
              error={
                emptySpecificSelection
                  ? i18n.translate('alertsUIShared.connectorActionSelector.emptySelectionError', {
                      defaultMessage: 'Select at least one action, or enable All.',
                    })
                  : undefined
              }
              fullWidth
            >
              <EuiPanel hasBorder paddingSize="m">
                <EuiInMemoryTable
                  items={sortedFilteredActions}
                  columns={columns}
                  itemId="name"
                  selection={selection}
                  onTableChange={({ page, sort }: CriteriaWithPagination<ConnectorActionDef>) => {
                    // EuiBasicTable clears selection before firing onChange on page/sort changes.
                    // Capture now and restore below; React batches both calls so this one wins.
                    const selectionToRestore = rawSelectedRef.current;
                    if (sort) setSortDirection(sort.direction);
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
        )
      )}
    </>
  );
};
