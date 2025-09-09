/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToken, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Dimension } from '@kbn/metrics-experience-plugin/common/types';
import { getTopLevelNamespace, sortDimensions } from '../../common/utils/dimensions';

interface DimensionBadgesProps {
  dimensions: Dimension[];
  metricName: string;
  maxDisplay?: number;
}

export const DimensionBadges = ({
  dimensions,
  metricName,
  maxDisplay = 10,
}: DimensionBadgesProps) => {
  const { euiTheme } = useEuiTheme();

  // Extract top-level namespace from metric name (e.g., "system" from "system.network.in.bytes")
  const topLevelNamespace = getTopLevelNamespace(metricName);

  // Sort dimensions to prioritize attributes.* and top-level namespace
  const sortedDimensions = sortDimensions(dimensions, topLevelNamespace);

  const displayedDimensions = sortedDimensions.slice(0, maxDisplay);
  const remainingCount = dimensions.length - maxDisplay;

  return (
    <div>
      {displayedDimensions.map((dimension, index) => {
        const isAttributes = dimension.name.startsWith('attributes.');
        const isTopLevel = dimension.name.startsWith(topLevelNamespace);
        const badgeColor = isAttributes || isTopLevel ? 'default' : 'hollow';
        const isKeyword = dimension.type === 'keyword';

        const badgeContent = (
          <EuiBadge
            key={dimension.name}
            color={badgeColor}
            style={{ marginRight: euiTheme.size.xs, marginBottom: euiTheme.size.xxs }}
          >
            {isKeyword && (
              <EuiToken
                iconType="tokenKeyword"
                size="xs"
                style={{ marginRight: euiTheme.size.xs }}
              />
            )}
            {dimension.name}
            {!isKeyword && ` (${dimension.type})`}
          </EuiBadge>
        );

        // Show tooltip only if description is available
        if (dimension.description) {
          return (
            <EuiToolTip key={dimension.name} content={dimension.description}>
              {badgeContent}
            </EuiToolTip>
          );
        }

        return badgeContent;
      })}
      {remainingCount > 0 && (
        <EuiText size="xs" style={{ marginTop: euiTheme.size.xs }}>
          {'...'}
          {remainingCount}{' '}
          {i18n.translate('metricsExperience.dimensionBadges.moreTextLabel', {
            defaultMessage: 'more',
          })}
        </EuiText>
      )}
    </div>
  );
};
