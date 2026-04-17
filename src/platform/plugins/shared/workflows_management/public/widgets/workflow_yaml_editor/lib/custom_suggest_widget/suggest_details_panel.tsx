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

/**
 * Collapse long Zod dumps into a short human-readable label. The full Zod
 * rendering adds no signal beyond "this is an object/array/etc." and drowns
 * the details panel — users who need the exact shape check the schema or
 * hover the variable.
 */
const compactTypeLabel = (type: string): string => {
  const trimmed = type.trim();
  if (trimmed.length === 0) return trimmed;
  // Short enough to read as-is.
  if (trimmed.length <= 48 && !trimmed.includes('\n')) return trimmed;

  // Array forms: `Foo[]`, `Array<Foo>`
  if (trimmed.endsWith('[]') || trimmed.startsWith('Array<')) return 'array';
  // Object-literal forms: `{ a: string; ... }` or `Record<...>`.
  if (trimmed.startsWith('{') || trimmed.startsWith('Record<')) return 'object';
  // Union forms with a common scalar.
  if (trimmed.includes(' | ')) {
    const parts = trimmed
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length <= 3 && parts.every((p) => p.length < 20)) return parts.join(' | ');
    return 'mixed';
  }
  // Fallback: truncate with ellipsis; rare because the forms above cover most cases.
  return `${trimmed.slice(0, 45)}…`;
};

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
