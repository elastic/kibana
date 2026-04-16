/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';

import { getSuggestWidgetStyles } from './suggest_widget_styles';
import type { EnrichedSuggestionItem } from './types';

interface SuggestDetailsPanelProps {
  item: EnrichedSuggestionItem | null;
}

export const SuggestDetailsPanel: React.FC<SuggestDetailsPanelProps> = ({ item }) => {
  const euiThemeContext = useEuiTheme();
  const styles = getSuggestWidgetStyles(euiThemeContext);

  if (!item) {
    return (
      <div css={styles.detailsPanel}>
        <div css={styles.emptyDetails}>{'Select a suggestion to see details'}</div>
      </div>
    );
  }

  return (
    <div css={styles.detailsPanel}>
      {/* Header: context label + item name */}
      <div>
        {item.contextLabel && <div css={styles.detailContext}>{`${item.contextLabel}:`}</div>}
        <div css={styles.detailName}>{item.label}</div>
      </div>

      {/* Type badges */}
      {item.types.length > 0 && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{'Type'}</div>
          <div css={styles.typeBadges}>
            {item.types.map((t) => (
              <span key={t} css={styles.typeBadge}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Required indicator */}
      {item.required !== null && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{'Required'}</div>
          <div css={item.required ? styles.requiredYes : styles.requiredNo}>
            {item.required ? 'Yes' : 'No'}
          </div>
        </div>
      )}

      {/* Description */}
      {item.description && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{'Description'}</div>
          <div css={styles.description}>{item.description}</div>
        </div>
      )}

      {/* Default value */}
      {item.defaultValue !== undefined && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{'Default'}</div>
          <div css={styles.defaultValue}>{item.defaultValue}</div>
        </div>
      )}

      {/* Example */}
      {item.example && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{'Example'}</div>
          <div css={styles.defaultValue}>{item.example}</div>
        </div>
      )}
    </div>
  );
};
