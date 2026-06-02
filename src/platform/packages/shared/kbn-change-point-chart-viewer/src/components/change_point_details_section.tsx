/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
import {
  formatPvalueLabel,
  getPvalueImpactLevel,
  PVALUE_IMPACT_COLORS,
  type PvalueImpactLevel,
} from '../utils/get_pvalue_impact';
import { humaniseType, getChangePointTypeDescription } from '../utils/change_point_type_utils';

interface ChangePointDetailsSectionProps {
  card: ChangePointCardModel;
  row: Readonly<Record<string, unknown>>;
  seriesColumns: { valueColumn: string; timeColumn: string };
}

const IMPACT_LEVEL_LABELS: Record<PvalueImpactLevel, string> = {
  high: i18n.translate('changePointChartViewer.details.impactHigh', {
    defaultMessage: 'high',
  }),
  moderate: i18n.translate('changePointChartViewer.details.impactModerate', {
    defaultMessage: 'moderate',
  }),
  low: i18n.translate('changePointChartViewer.details.impactLow', {
    defaultMessage: 'low',
  }),
};

/**
 * Displays change-point properties beneath the mini chart in the flyout.
 *
 * Short categorical facts (time, field, metric, type, p-value) are shown in a
 * two-column stat grid — muted label above a larger value — so they can be
 * scanned at a glance. The prose description is separated below a rule so it
 * gets its own reading space. Any item is omitted when its data is absent.
 */
export const ChangePointDetailsSection: React.FC<ChangePointDetailsSectionProps> = ({
  card,
  row,
  seriesColumns,
}) => {
  const pvalueRaw = row[card.pvalueColumnId];
  const pvalue =
    typeof pvalueRaw === 'number' && Number.isFinite(pvalueRaw) ? pvalueRaw : undefined;
  const impactLevel = pvalue !== undefined ? getPvalueImpactLevel(pvalue) : undefined;

  // Prefer values from the row itself so the details reflect the specific flyout row rather
  // than aggregate card-level data. BY-mode queries omit type/pvalue from the result schema,
  // so row[typeColumnId] will be undefined — the card-level fallback handles that case.
  const timeRaw = row[seriesColumns.timeColumn];
  const changePointDate = timeRaw != null ? new Date(timeRaw as string | number) : undefined;
  const changePointTime =
    changePointDate && !Number.isNaN(changePointDate.getTime())
      ? changePointDate.toLocaleString()
      : undefined;

  const typeRaw = row[card.typeColumnId];
  const rowType = typeof typeRaw === 'string' && typeRaw.length > 0 ? typeRaw : undefined;
  // Fall back to all card-level types for BY-mode where type is absent from the result schema.
  const typeLabel =
    rowType !== undefined
      ? humaniseType(rowType)
      : card.changePointTypes.length > 0
      ? card.changePointTypes.map(humaniseType).join(', ')
      : undefined;
  const description =
    impactLevel !== undefined
      ? rowType !== undefined
        ? getChangePointTypeDescription(rowType, impactLevel)
        : card.changePointTypes.length > 0
        ? card.changePointTypes
            .map((t) => getChangePointTypeDescription(t, impactLevel))
            .filter(Boolean)
            .join(' ')
        : undefined
      : undefined;

  const statItems: Array<{ label: string; value: NonNullable<React.ReactNode> }> = [];

  if (changePointTime) {
    statItems.push({
      label: i18n.translate('changePointChartViewer.details.timeLabel', {
        defaultMessage: 'Time',
      }),
      value: changePointTime,
    });
  }

  if (card.entityDescription) {
    statItems.push({
      label: i18n.translate('changePointChartViewer.details.fieldLabel', {
        defaultMessage: 'Field',
      }),
      value: card.entityDescription,
    });
  }

  statItems.push({
    label: i18n.translate('changePointChartViewer.details.metricLabel', {
      defaultMessage: 'Metric',
    }),
    value: seriesColumns.valueColumn,
  });

  if (typeLabel) {
    statItems.push({
      label: i18n.translate('changePointChartViewer.details.typeLabel', {
        defaultMessage: 'Change point type',
      }),
      value: typeLabel,
    });
  }

  if (pvalue !== undefined && impactLevel !== undefined) {
    statItems.push({
      label: i18n.translate('changePointChartViewer.details.pvalueLabel', {
        defaultMessage: 'p-value',
      }),
      value: (
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap={false} responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color={PVALUE_IMPACT_COLORS[impactLevel]}>
              {IMPACT_LEVEL_LABELS[impactLevel]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{formatPvalueLabel(pvalue)}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    });
  }

  if (statItems.length === 0 && !description) return null;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="s">
        {statItems.length > 0 && (
          <EuiFlexGrid columns={2} gutterSize="m">
            {statItems.map(({ label, value }) => (
              <EuiFlexItem key={label}>
                <EuiText size="xs" color="subdued">
                  <p>{label}</p>
                </EuiText>
                <EuiText size="s">{value}</EuiText>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        )}
        {description && (
          <>
            {statItems.length > 0 && <EuiHorizontalRule margin="xs" />}
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('changePointChartViewer.details.descriptionLabel', {
                  defaultMessage: 'Description',
                })}
              </p>
            </EuiText>
            <EuiText size="s">
              <p>{description}</p>
            </EuiText>
          </>
        )}
      </EuiPanel>
    </>
  );
};
