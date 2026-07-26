/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';

import type {
  ActionType,
  ActiveAction,
  ActiveColumn,
  ActiveFilter,
  ColumnType,
  FilterType,
} from './playground_state';
import { ACTION_DEFINITIONS, COLUMN_DEFINITIONS, FILTER_DEFINITIONS } from './playground_state';
import { BASE_FONT } from './jsx_tag';

// =============================================================================
// Styles
// =============================================================================

const panelCss = css({ marginLeft: -24 });

// =============================================================================
// Types
// =============================================================================

export interface ComponentPaletteProps {
  activeColumns: ActiveColumn[];
  activeFilters: ActiveFilter[];
  activeActions: ActiveAction[];
  onAddColumn: (type: ColumnType) => void;
  onAddFilter: (type: FilterType) => void;
  onAddAction: (type: ActionType) => void;
}

// =============================================================================
// PaletteRow
// =============================================================================

interface PaletteRowProps {
  label: string;
  children: React.ReactNode;
}

const PaletteRow = ({ label, children }: PaletteRowProps) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="xs" style={BASE_FONT}>
        <strong>{label}</strong>
      </EuiText>
    </EuiFlexItem>
    {children}
  </EuiFlexGroup>
);

// =============================================================================
// ComponentPalette
// =============================================================================

/**
 * Grouped palette of available columns, filters, and actions.
 *
 * Items already present in the builder are hidden. Click the `+` badge
 * to add a component.
 */
export const ComponentPalette = ({
  activeColumns,
  activeFilters,
  activeActions,
  onAddColumn,
  onAddFilter,
  onAddAction,
}: ComponentPaletteProps) => {
  const availableColumns = COLUMN_DEFINITIONS.filter(
    (def) => def.allowMultiple || !activeColumns.some((c) => c.type === def.type)
  );

  const availableFilters = FILTER_DEFINITIONS.filter(
    (def) => !activeFilters.some((f) => f.type === def.type)
  );

  const availableActions = ACTION_DEFINITIONS.filter(
    (def) => !activeActions.some((a) => a.type === def.type)
  );

  return (
    <EuiPanel paddingSize="s" color="subdued" hasBorder css={panelCss}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <PaletteRow label="Filters">
            {availableFilters.map((def) => (
              <EuiFlexItem grow={false} key={def.type}>
                <EuiBadge
                  color="hollow"
                  iconType="plus"
                  iconSide="right"
                  onClick={() => onAddFilter(def.type)}
                  onClickAriaLabel={`Add ${def.label}`}
                >
                  {def.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
            {availableFilters.length === 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <em>all added</em>
                </EuiText>
              </EuiFlexItem>
            )}
          </PaletteRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <PaletteRow label="Columns">
            {availableColumns.map((def) => (
              <EuiFlexItem grow={false} key={def.type}>
                <EuiBadge
                  color="hollow"
                  iconType="plus"
                  iconSide="right"
                  onClick={() => onAddColumn(def.type)}
                  onClickAriaLabel={`Add ${def.label}`}
                >
                  {def.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
            {availableColumns.length === 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <em>all added</em>
                </EuiText>
              </EuiFlexItem>
            )}
          </PaletteRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <PaletteRow label="Actions">
            {availableActions.map((def) => (
              <EuiFlexItem grow={false} key={def.type}>
                <EuiBadge
                  color="hollow"
                  iconType="plus"
                  iconSide="right"
                  onClick={() => onAddAction(def.type)}
                  onClickAriaLabel={`Add ${def.label}`}
                >
                  {def.label}
                </EuiBadge>
              </EuiFlexItem>
            ))}
            {availableActions.length === 0 && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <em>all added</em>
                </EuiText>
              </EuiFlexItem>
            )}
          </PaletteRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
