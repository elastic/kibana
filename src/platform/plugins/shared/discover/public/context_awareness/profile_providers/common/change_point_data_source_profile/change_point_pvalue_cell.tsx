/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';

/** Impact level from p-value: lower p-value = more extreme change */
export type PvalueImpactLevel = 'extreme' | 'high' | 'medium' | 'low' | 'minimal';

const PVALUE_THRESHOLDS: Array<{ max: number; level: PvalueImpactLevel }> = [
  { max: 0.001, level: 'extreme' },
  { max: 0.01, level: 'high' },
  { max: 0.05, level: 'medium' },
  { max: 0.1, level: 'low' },
  { max: 1, level: 'minimal' },
];

function getImpactLevel(pvalue: number): PvalueImpactLevel {
  for (const { max, level } of PVALUE_THRESHOLDS) {
    if (pvalue < max) return level;
  }
  return 'minimal';
}

const IMPACT_LEVEL_COLORS: Record<PvalueImpactLevel, string> = {
  extreme: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
  minimal: 'hollow',
};

const IMPACT_LEVEL_LABELS: Record<PvalueImpactLevel, string> = {
  extreme: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactVeryHigh', {
    defaultMessage: 'extreme',
  }),
  high: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactHigh', {
    defaultMessage: 'high',
  }),
  medium: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactMedium', {
    defaultMessage: 'medium',
  }),
  low: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactLow', {
    defaultMessage: 'low',
  }),
  minimal: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactMinimal', {
    defaultMessage: 'minimal',
  }),
};

function formatPvalue(value: number): string {
  if (value === 0) return '0';
  if (value >= 0.01 && value < 1) return value.toFixed(4);
  return value.toExponential(2);
}

export interface ChangePointPvalueCellContext {
  pvalueColumnId: string;
}

interface ChangePointPvalueCellProps extends DataGridCellValueElementProps {
  context: ChangePointPvalueCellContext;
}

export const ChangePointPvalueCell: FC<ChangePointPvalueCellProps> = ({
  row,
  columnId,
  context,
}) => {
  const raw = row.flattened?.[columnId] ?? row.flattened?.[context.pvalueColumnId];
  const pvalue = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;

  if (pvalue === null || pvalue === undefined) {
    return '(null)';
  }

  const level = getImpactLevel(pvalue);
  const color = IMPACT_LEVEL_COLORS[level];
  const label = IMPACT_LEVEL_LABELS[level];

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap={false}
      responsive={false}
      direction="column"
    >
      <EuiFlexItem grow={false}>
        <EuiBadge color={color} title={String(pvalue)}>
          {label}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{formatPvalue(pvalue)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
