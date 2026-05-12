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
import { i18n } from '@kbn/i18n';

import { getSuggestWidgetStyles } from './suggest_widget_styles';
import { compactTypeLabel, extractTopLevelKeys, summarizeKeyType } from './type_helpers';
import type { EnrichedSuggestionItem } from './types';

const EMPTY_MESSAGE = i18n.translate('workflows.yamlEditor.suggest.details.empty', {
  defaultMessage: 'Select a suggestion to see details',
});
const TYPE_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.type', {
  defaultMessage: 'Type',
});
const REQUIRED_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.required', {
  defaultMessage: 'Required',
});
const DESCRIPTION_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.description', {
  defaultMessage: 'Description',
});
const DEFAULT_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.default', {
  defaultMessage: 'Default',
});
const EXAMPLE_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.example', {
  defaultMessage: 'Example',
});
const YES_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.requiredYes', {
  defaultMessage: 'Yes',
});
const NO_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.requiredNo', {
  defaultMessage: 'No',
});
const KEYS_LABEL = i18n.translate('workflows.yamlEditor.suggest.details.keys', {
  defaultMessage: 'Keys',
});
const MORE_KEYS_MESSAGE = (n: number) =>
  i18n.translate('workflows.yamlEditor.suggest.details.moreKeys', {
    defaultMessage: '+{n} more',
    values: { n },
  });

const MAX_INLINE_KEYS = 6;

interface SuggestDetailsPanelProps {
  item: EnrichedSuggestionItem | null;
}

export const SuggestDetailsPanel: React.FC<SuggestDetailsPanelProps> = ({ item }) => {
  const euiThemeContext = useEuiTheme();
  const styles = getSuggestWidgetStyles(euiThemeContext);

  if (!item) {
    return (
      <div css={styles.detailsPanel}>
        <div css={styles.emptyDetails}>{EMPTY_MESSAGE}</div>
      </div>
    );
  }

  // When the type is a shaped object, surface the first few top-level keys so
  // the details panel gives a hint about the shape without showing the full
  // Zod dump. Works for types that carry a trailing ` // description` suffix
  // because extractTopLevelKeys finds the matching closing brace rather than
  // requiring the string to end on `}`.
  const keysSource = item.types.find((t) => t.includes('{'));
  const topLevelKeys = keysSource ? extractTopLevelKeys(keysSource) : [];
  const visibleKeys = topLevelKeys.slice(0, MAX_INLINE_KEYS);
  const hiddenKeyCount = Math.max(0, topLevelKeys.length - visibleKeys.length);

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
          <div css={styles.detailLabel}>{TYPE_LABEL}</div>
          <div css={styles.typeBadges}>
            {item.types.map((t) => (
              <span key={t} css={styles.typeBadge}>
                {compactTypeLabel(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Representative keys for object shapes */}
      {visibleKeys.length > 0 && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{KEYS_LABEL}</div>
          <div css={styles.keyList}>
            {visibleKeys.map(({ key, type }) => (
              <div key={key} css={styles.keyRow}>
                <span css={styles.keyName}>{key}</span>
                <span css={styles.keyType}>{summarizeKeyType(type)}</span>
              </div>
            ))}
            {hiddenKeyCount > 0 && (
              <div css={styles.keyMore}>{MORE_KEYS_MESSAGE(hiddenKeyCount)}</div>
            )}
          </div>
        </div>
      )}

      {/* Required indicator */}
      {item.required !== null && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{REQUIRED_LABEL}</div>
          <div css={item.required ? styles.requiredYes : styles.requiredNo}>
            {item.required ? YES_LABEL : NO_LABEL}
          </div>
        </div>
      )}

      {/* Description */}
      {item.description && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{DESCRIPTION_LABEL}</div>
          <div css={styles.description}>{item.description}</div>
        </div>
      )}

      {/* Default value */}
      {item.defaultValue !== undefined && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{DEFAULT_LABEL}</div>
          <div css={styles.defaultValue}>{item.defaultValue}</div>
        </div>
      )}

      {/* Example */}
      {item.example && (
        <div css={styles.detailSection}>
          <div css={styles.detailLabel}>{EXAMPLE_LABEL}</div>
          <div css={styles.defaultValue}>{item.example}</div>
        </div>
      )}
    </div>
  );
};
