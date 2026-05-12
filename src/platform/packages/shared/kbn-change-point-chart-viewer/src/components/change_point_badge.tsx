/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';
import { getPvalueImpactLevel, PVALUE_IMPACT_COLORS } from '../utils/get_pvalue_impact';

export interface ChangePointBadgeProps {
  changePointTypes: ChangePointCardModel['changePointTypes'];
  minPvalue: ChangePointCardModel['minPvalue'];
}

/** Converts a raw ES type string to a human-readable label, e.g. "step_change" → "Step change". */
const humaniseType = (type: string): string => {
  const withSpaces = type.replace(/_/g, ' ');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

/** Plain-English descriptions shown in the badge tooltip, keyed by ES change-point type string. */
const CHANGE_POINT_TYPE_DESCRIPTIONS: Record<string, string> = {
  dip: i18n.translate('changePointChartViewer.badge.tooltip.dip', {
    defaultMessage: 'A significant dip occurs at this change point.',
  }),
  distribution_change: i18n.translate('changePointChartViewer.badge.tooltip.distributionChange', {
    defaultMessage: 'The overall distribution of the values has changed significantly.',
  }),
  non_stationary: i18n.translate('changePointChartViewer.badge.tooltip.nonStationary', {
    defaultMessage:
      'There is no change point, but the values are not from a stationary distribution.',
  }),
  spike: i18n.translate('changePointChartViewer.badge.tooltip.spike', {
    defaultMessage: 'A significant spike occurs at this point.',
  }),
  stationary: i18n.translate('changePointChartViewer.badge.tooltip.stationary', {
    defaultMessage: 'No change point found.',
  }),
  step_change: i18n.translate('changePointChartViewer.badge.tooltip.stepChange', {
    defaultMessage:
      'The change indicates a statistically significant step up or down in value distribution.',
  }),
  trend_change: i18n.translate('changePointChartViewer.badge.tooltip.trendChange', {
    defaultMessage: 'There is an overall trend change occurring at this point.',
  }),
};

/**
 * Badge showing the change-point type(s) for a chart card, colour-coded by the card's minimum
 * pvalue to match the significance colours in the Discover results table.
 *
 * Renders nothing when no type data is available (BY mode) or when minPvalue is undefined.
 * Positioning is handled by the parent — this component renders only the EuiBadge itself.
 */
export const ChangePointBadge: React.FC<ChangePointBadgeProps> = ({
  changePointTypes,
  minPvalue,
}) => {
  const { euiTheme } = useEuiTheme();

  if (changePointTypes.length === 0 || minPvalue === undefined) return null;

  const label = changePointTypes.map(humaniseType).join(', ');
  const color = PVALUE_IMPACT_COLORS[getPvalueImpactLevel(minPvalue)]; // 'danger' | 'warning' | 'primary'
  const iconColor = euiTheme.colors[color as keyof typeof euiTheme.colors] as string;

  const tooltipLines = changePointTypes
    .map((type) => CHANGE_POINT_TYPE_DESCRIPTIONS[type])
    .filter(Boolean);
  const tooltipContent =
    tooltipLines.length > 0
      ? tooltipLines.join('\n\n')
      : i18n.translate('changePointChartViewer.badge.tooltip.unknown', {
          defaultMessage: 'A statistically significant change was detected in this metric.',
        });

  return (
    <EuiToolTip content={tooltipContent} position="bottom">
      <EuiBadge
        color="hollow"
        iconType="dot"
        iconSide="left"
        title={String(minPvalue)}
        tabIndex={0}
        css={css`
          & .euiBadge__icon {
            color: ${iconColor};
          }
        `}
      >
        {label}
      </EuiBadge>
    </EuiToolTip>
  );
};
