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
import {
  getPvalueImpactLevel,
  PVALUE_IMPACT_COLORS,
  type PvalueImpactLevel,
} from '@kbn/change-point-chart-viewer';

const IMPACT_LEVEL_LABELS: Record<PvalueImpactLevel, string> = {
  high: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactHigh', {
    defaultMessage: 'high',
  }),
  moderate: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactModerate', {
    defaultMessage: 'moderate',
  }),
  low: i18n.translate('discover.contextAwareness.changePointPvalueCell.impactLow', {
    defaultMessage: 'low',
  }),
};

function formatPvalue(value: number): string {
  if (value === 0) return '0';
  if (value >= 0.01 && value < 1) return value.toFixed(5);
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
    return null;
  }

  const level = getPvalueImpactLevel(pvalue);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiBadge color={PVALUE_IMPACT_COLORS[level]} title={String(pvalue)}>
          {IMPACT_LEVEL_LABELS[level]}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{formatPvalue(pvalue)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
