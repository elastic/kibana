/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToken, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';

interface Dimension {
  name: string;
  type: string;
  description?: string;
}

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
  // Extract top-level namespace from metric name (e.g., "system" from "system.network.in.bytes")
  const topLevelNamespace = metricName.split('.')[0] + '.';

  // Sort dimensions to prioritize attributes.* and top-level namespace
  const sortedDimensions = [...dimensions].sort((a, b) => {
    const aIsAttributes = a.name.startsWith('attributes.');
    const bIsAttributes = b.name.startsWith('attributes.');
    const aIsTopLevel = a.name.startsWith(topLevelNamespace);
    const bIsTopLevel = b.name.startsWith(topLevelNamespace);

    // Priority: attributes.* first, then top-level namespace, then others
    if (aIsAttributes && !bIsAttributes) return -1;
    if (!aIsAttributes && bIsAttributes) return 1;
    if (aIsTopLevel && !bIsTopLevel && !aIsAttributes && !bIsAttributes) return -1;
    if (!aIsTopLevel && bIsTopLevel && !aIsAttributes && !bIsAttributes) return 1;

    // Alphabetical for same priority
    return a.name.localeCompare(b.name);
  });

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
            key={index}
            color={badgeColor}
            style={{ marginRight: '4px', marginBottom: '2px' }}
          >
            {isKeyword && (
              <EuiToken iconType="tokenKeyword" size="xs" style={{ marginRight: '4px' }} />
            )}
            {dimension.name}
            {!isKeyword && ` (${dimension.type})`}
          </EuiBadge>
        );

        // Show tooltip only if description is available
        if (dimension.description) {
          return (
            <EuiToolTip key={index} content={dimension.description}>
              {badgeContent}
            </EuiToolTip>
          );
        }

        return badgeContent;
      })}
      {remainingCount > 0 && (
        <EuiText size="xs" style={{ marginTop: '4px' }}>
          ... {remainingCount} more
        </EuiText>
      )}
    </div>
  );
};
