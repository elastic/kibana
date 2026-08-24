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
  EuiBadge,
  EuiButtonGroup,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ActionScope } from '@kbn/connector-specs';
import { getEffectiveScope, resolveActionScope } from '@kbn/connector-specs';
import type { ConnectorActionDef } from '../apis/fetch_connector_spec';

const SCOPE_ORDER: ActionScope[] = ['read', 'write', 'destroy'];

const SCOPE_LABELS: Record<ActionScope, string> = {
  read: i18n.translate('alertsUIShared.connectorActionSelector.scopeLabelRead', {
    defaultMessage: 'Read',
  }),
  write: i18n.translate('alertsUIShared.connectorActionSelector.scopeLabelWrite', {
    defaultMessage: 'Write',
  }),
  destroy: i18n.translate('alertsUIShared.connectorActionSelector.scopeLabelDestroy', {
    defaultMessage: 'Delete',
  }),
};

const SCOPE_DESCRIPTIONS: Record<ActionScope, string> = {
  read: i18n.translate('alertsUIShared.connectorActionSelector.scopeDescRead', {
    defaultMessage: 'List, get, search, export',
  }),
  write: i18n.translate('alertsUIShared.connectorActionSelector.scopeDescWrite', {
    defaultMessage: 'Create, update, index',
  }),
  destroy: i18n.translate('alertsUIShared.connectorActionSelector.scopeDescDestroy', {
    defaultMessage: 'Remove, purge, close',
  }),
};

const SCOPE_ICONS: Record<ActionScope, string> = {
  read: 'eye',
  write: 'documentEdit',
  destroy: 'trash',
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

interface ScopeGroupProps {
  scope: ActionScope;
  actions: ConnectorActionDef[];
  selected: ReadonlySet<string>;
  readOnly: boolean;
  onToggleGroup: (scope: ActionScope, select: boolean) => void;
  onToggleAction: (name: string) => void;
  defaultOpen?: boolean;
}

const ScopeGroup: React.FC<ScopeGroupProps> = ({
  scope,
  actions,
  selected,
  readOnly,
  onToggleGroup,
  onToggleAction,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState('');

  const selectedCount = useMemo(
    () => actions.filter((a) => selected.has(a.name)).length,
    [actions, selected]
  );
  const isAllSelected = selectedCount === actions.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < actions.length;

  const filteredActions = useMemo(() => {
    if (!filter) return actions;
    const lower = filter.toLowerCase();
    return actions.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        (a.description?.toLowerCase().includes(lower) ?? false)
    );
  }, [actions, filter]);

  const checkboxId = `scopeGroup-${scope}`;

  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={checkboxId}
            checked={isAllSelected}
            indeterminate={isIndeterminate}
            onChange={() => onToggleGroup(scope, !(isAllSelected || isIndeterminate))}
            disabled={readOnly}
            data-test-subj={`scopeGroupCheckbox-${scope}`}
          />
        </EuiFlexItem>
        {/* Clicking anywhere on the rest of the header toggles the group open/closed */}
        <EuiFlexItem grow onClick={() => setIsOpen((v) => !v)} style={{ cursor: 'pointer' }}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={SCOPE_ICONS[scope]} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{SCOPE_LABELS[scope]}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {SCOPE_DESCRIPTIONS[scope]}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge>
                {selectedCount} / {actions.length}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type={isOpen ? 'arrowUp' : 'arrowDown'} aria-hidden={true} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isOpen && (
        <>
          <EuiSpacer size="s" />
          <EuiFieldSearch
            placeholder={i18n.translate(
              'alertsUIShared.connectorActionSelector.filterActionsPlaceholder',
              {
                defaultMessage: 'Filter {scope} actions...',
                values: { scope: SCOPE_LABELS[scope].toLowerCase() },
              }
            )}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            compressed
            fullWidth
            data-test-subj={`scopeGroupSearch-${scope}`}
          />
          <EuiSpacer size="xs" />
          {filteredActions.map((action) => (
            <EuiFlexGroup
              key={action.name}
              alignItems="center"
              gutterSize="s"
              responsive={false}
              style={{ paddingBlock: '4px' }}
            >
              <EuiFlexItem grow={false}>
                <EuiCheckbox
                  id={`action-${action.name}`}
                  checked={selected.has(action.name)}
                  onChange={() => onToggleAction(action.name)}
                  disabled={readOnly}
                  data-test-subj={`connectorActionCheckbox-${action.name}`}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column" gutterSize="none">
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{action.name}</strong>
                    </EuiText>
                  </EuiFlexItem>
                  {action.description && (
                    <EuiFlexItem>
                      <EuiText size="xs" color="subdued">
                        {action.description}
                      </EuiText>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
        </>
      )}
    </EuiPanel>
  );
};

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

  const actionsByScope = useMemo(() => {
    const groups: Partial<Record<ActionScope, ConnectorActionDef[]>> = {};
    for (const action of actions) {
      const scope = resolveActionScope(action);
      if (!groups[scope]) groups[scope] = [];
      groups[scope]!.push(action);
    }
    return groups;
  }, [actions]);

  const presentScopes = useMemo(
    () => SCOPE_ORDER.filter((s) => (actionsByScope[s]?.length ?? 0) > 0),
    [actionsByScope]
  );

  // Default when switching to specific: all read-scoped actions
  const defaultReadActionNames = useMemo(
    () => (actionsByScope.read ?? []).map((a) => a.name),
    [actionsByScope]
  );

  const previousSpecificRef = useRef<string[] | null>(
    Array.isArray(rawSelected) && rawSelected.length > 0 ? rawSelected : null
  );

  const selectedSet = useMemo(() => new Set(rawSelected ?? []), [rawSelected]);

  const effectiveScope = useMemo(
    () => (isAll ? null : getEffectiveScope(actions, rawSelected ?? [])),
    [isAll, actions, rawSelected]
  );

  const handleAllToggle = useCallback(() => {
    if (isAll) {
      onChange(previousSpecificRef.current ?? defaultReadActionNames);
    } else {
      if (Array.isArray(rawSelected) && rawSelected.length > 0) {
        previousSpecificRef.current = rawSelected;
      }
      onChange(null);
    }
  }, [isAll, onChange, rawSelected, defaultReadActionNames]);

  const handleToggleGroup = useCallback(
    (scope: ActionScope, select: boolean) => {
      const groupNames = new Set((actionsByScope[scope] ?? []).map((a) => a.name));
      const current = rawSelected ?? [];
      const next = select
        ? [...new Set([...current, ...groupNames])]
        : current.filter((n) => !groupNames.has(n));
      onChange(next);
    },
    [actionsByScope, rawSelected, onChange]
  );

  const handleToggleAction = useCallback(
    (name: string) => {
      const current = rawSelected ?? [];
      const next = selectedSet.has(name) ? current.filter((n) => n !== name) : [...current, name];
      onChange(next);
    },
    [rawSelected, selectedSet, onChange]
  );

  const emptySpecificSelection = !isAll && (rawSelected ?? []).length === 0;

  return (
    <EuiFormRow
      label={i18n.translate('alertsUIShared.connectorActionSelector.actionsLabel', {
        defaultMessage: 'Actions',
      })}
      labelAppend={
        <EuiButtonGroup
          legend={i18n.translate('alertsUIShared.connectorActionSelector.modeLegend', {
            defaultMessage: 'Action selection mode',
          })}
          options={MODE_OPTIONS}
          idSelected={isAll ? MODE_ALL : MODE_CUSTOM}
          onChange={(id) => {
            if ((id === MODE_ALL) !== isAll) handleAllToggle();
          }}
          buttonSize="compressed"
          isDisabled={readOnly}
          data-test-subj="connectorActionSelectorMode"
        />
      }
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
      <>
        {isAll ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('alertsUIShared.connectorActionSelector.allActionsHint', {
              defaultMessage: 'All actions are available to the agent.',
            })}
          </EuiText>
        ) : (
          <>
            {presentScopes.map((scope, i) => (
              <React.Fragment key={scope}>
                {i > 0 && <EuiSpacer size="s" />}
                <ScopeGroup
                  scope={scope}
                  actions={actionsByScope[scope] ?? []}
                  selected={selectedSet}
                  readOnly={readOnly}
                  onToggleGroup={handleToggleGroup}
                  onToggleAction={handleToggleAction}
                  defaultOpen={true}
                />
              </React.Fragment>
            ))}
            {effectiveScope && (
              <>
                <EuiSpacer size="s" />
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      {i18n.translate('alertsUIShared.connectorActionSelector.scopeLabel', {
                        defaultMessage: 'Scope:',
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={SCOPE_BADGE_COLORS[effectiveScope]}>{effectiveScope}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>
        )}
      </>
    </EuiFormRow>
  );
};
