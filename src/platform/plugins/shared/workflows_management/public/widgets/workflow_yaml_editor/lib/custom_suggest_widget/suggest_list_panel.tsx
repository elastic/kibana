/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiToken, type IconType, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { fuzzyMatch, getLabelHighlightIndices, highlightSegments } from './fuzzy_match';
import { getSuggestWidgetStyles } from './suggest_widget_styles';
import type { EnrichedSuggestionItem } from './types';
import { getStepIconType } from '../../../../shared/ui/step_icons/get_step_icon_type';
import { HardcodedIcons } from '../../../../shared/ui/step_icons/hardcoded_icons';

const KIND_LABELS = {
  step: i18n.translate('workflows.yamlEditor.suggest.kind.step', { defaultMessage: 'step' }),
  elasticsearch: i18n.translate('workflows.yamlEditor.suggest.kind.elasticsearch', {
    defaultMessage: 'elasticsearch',
  }),
  kibana: i18n.translate('workflows.yamlEditor.suggest.kind.kibana', {
    defaultMessage: 'kibana',
  }),
  connector: i18n.translate('workflows.yamlEditor.suggest.kind.connector', {
    defaultMessage: 'connector',
  }),
  variable: i18n.translate('workflows.yamlEditor.suggest.kind.variable', {
    defaultMessage: 'variable',
  }),
  filter: i18n.translate('workflows.yamlEditor.suggest.kind.filter', {
    defaultMessage: 'filter',
  }),
  keyword: i18n.translate('workflows.yamlEditor.suggest.kind.keyword', {
    defaultMessage: 'keyword',
  }),
  trigger: i18n.translate('workflows.yamlEditor.suggest.kind.trigger', {
    defaultMessage: 'trigger',
  }),
  property: i18n.translate('workflows.yamlEditor.suggest.kind.property', {
    defaultMessage: 'property',
  }),
} as const;

const LIST_HEADER = i18n.translate('workflows.yamlEditor.suggest.listHeader', {
  defaultMessage: 'Suggested',
});
const LIST_ARIA_LABEL = i18n.translate('workflows.yamlEditor.suggest.listAriaLabel', {
  defaultMessage: 'Suggestions',
});

/**
 * Resolve the icon for a suggestion item using the same lookup chain as
 * the Monaco suggest widget's CSS injection pipeline:
 *
 * 1. HardcodedIcons with the full type (e.g., ".slack_api", "elasticsearch", "if")
 * 2. HardcodedIcons with the base prefix (e.g., ".slack_api" from ".slack_api.searchMessages")
 * 3. HardcodedIcons with "elasticsearch" / "kibana" prefix check
 * 4. getStepIconType fallback (EUI icon names like "plugs", "branch", etc.)
 */
const getItemIcon = (typeStr: string): IconType => {
  // Try exact match in HardcodedIcons (handles ".slack", ".slack_api", "console", "if", etc.)
  if (HardcodedIcons[typeStr]) {
    return HardcodedIcons[typeStr];
  }

  // Try base connector type (e.g., ".slack_api" from ".slack_api.searchMessages")
  if (typeStr.includes('.')) {
    const dotIdx = typeStr.indexOf('.', typeStr.startsWith('.') ? 1 : 0);
    if (dotIdx > 0) {
      const base = typeStr.slice(0, dotIdx);
      if (HardcodedIcons[base]) {
        return HardcodedIcons[base];
      }
    }
  }

  // Prefix-based checks for elasticsearch.* and kibana.*
  if (typeStr.startsWith('elasticsearch')) return HardcodedIcons.elasticsearch;
  if (typeStr.startsWith('kibana')) return HardcodedIcons.kibana;

  // Fallback to getStepIconType (returns EUI icon names for built-in step types)
  return getStepIconType(typeStr.replace(/^\./, ''));
};

export interface FilteredItem {
  item: EnrichedSuggestionItem;
  /** Highlight indices on the label (not filterText) for rendering */
  labelHighlightIndices: number[];
  score: number;
}

/** Get the descriptive kind label to show next to each item. */
const getKindLabel = (item: EnrichedSuggestionItem): string => {
  // For step/connector type suggestions, the description is more useful than the category
  if (item.category === 'connector' || item.category === 'step') {
    if (item.description?.startsWith('Built-in')) return KIND_LABELS.step;
    if (item.label.startsWith('elasticsearch.')) return KIND_LABELS.elasticsearch;
    if (item.label.startsWith('kibana.')) return KIND_LABELS.kibana;
    return KIND_LABELS.connector;
  }
  if (item.category === 'variable') return KIND_LABELS.variable;
  if (item.category === 'filter') return KIND_LABELS.filter;
  if (item.category === 'keyword') return KIND_LABELS.keyword;
  if (item.category === 'trigger') return KIND_LABELS.trigger;
  if (item.category === 'param') return KIND_LABELS.property;
  return item.category;
};

export const getFilteredItems = (
  items: EnrichedSuggestionItem[],
  filterText: string
): FilteredItem[] => {
  if (!filterText) {
    return items.map((item) => ({ item, labelHighlightIndices: [], score: 0 }));
  }

  return items
    .map((item) => {
      // Score against filterText (or label if no filterText) — same as Monaco
      const scoreText = item.filterText ?? item.label;
      const result = fuzzyMatch(filterText, scoreText);
      if (!result.matches) return null;

      // Get highlight indices for the LABEL (which is what's rendered).
      // When filterText differs from label, re-score against label for highlights.
      const labelIndices = getLabelHighlightIndices(filterText, item.label, item.filterText);

      return { item, labelHighlightIndices: labelIndices, score: result.score };
    })
    .filter((entry): entry is FilteredItem => entry !== null)
    .sort((a, b) => b.score - a.score);
};

interface SuggestListPanelProps {
  filteredItems: FilteredItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAccept: (index: number) => void;
}

export const SuggestListPanel: React.FC<SuggestListPanelProps> = ({
  filteredItems,
  selectedIndex,
  onSelect,
  onAccept,
}) => {
  const euiThemeContext = useEuiTheme();
  const styles = getSuggestWidgetStyles(euiThemeContext);
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selectedEl = listEl.children[selectedIndex] as HTMLElement | undefined;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      onAccept(index);
    },
    [onAccept]
  );

  return (
    <div css={styles.listPanel}>
      <div css={styles.listHeader}>{LIST_HEADER}</div>
      <div css={styles.listScroll} ref={listRef} role="listbox" aria-label={LIST_ARIA_LABEL}>
        {filteredItems.map(({ item, labelHighlightIndices }, i) => {
          const isSelected = i === selectedIndex;
          const segments = highlightSegments(item.label, labelHighlightIndices);

          return (
            <div
              key={`${item.label}-${i}`}
              id={`custom-suggest-item-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={isSelected}
              aria-label={`${item.label}, ${item.category}`}
              css={[styles.listItem, isSelected && styles.listItemSelected]}
              onMouseDown={(e) => handleMouseDown(e, i)}
              onMouseEnter={() => onSelect(i)}
            >
              <span css={[styles.itemIcon, isSelected && styles.itemIconSelected]}>
                {item.category === 'variable' ? (
                  <EuiToken iconType="tokenVariable" size="s" shape="square" aria-hidden={true} />
                ) : (
                  <EuiIcon
                    type={getItemIcon(item.filterText ?? item.label)}
                    size="s"
                    color={isSelected ? 'inherit' : 'subdued'}
                    aria-hidden={true}
                  />
                )}
              </span>
              <span css={styles.itemLabel}>
                {segments.map((seg, si) =>
                  seg.highlighted ? (
                    <span
                      key={si}
                      css={[styles.matchHighlight, isSelected && styles.matchHighlightSelected]}
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={si}>{seg.text}</span>
                  )
                )}
              </span>
              <span css={[styles.itemKind, isSelected && styles.itemKindSelected]}>
                {getKindLabel(item)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
