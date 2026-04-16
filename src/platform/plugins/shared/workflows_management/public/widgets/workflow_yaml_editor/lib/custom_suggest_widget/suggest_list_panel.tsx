/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useRef } from 'react';

import { fuzzyMatch, getLabelHighlightIndices, highlightSegments } from './fuzzy_match';
import { getSuggestWidgetStyles } from './suggest_widget_styles';
import type { EnrichedSuggestionItem, SuggestionCategory } from './types';

export interface FilteredItem {
  item: EnrichedSuggestionItem;
  /** Highlight indices on the label (not filterText) for rendering */
  labelHighlightIndices: number[];
  score: number;
}

const getIconForCategory = (category: SuggestionCategory): string => {
  switch (category) {
    case 'connector':
      return '>_';
    case 'step':
      return 'fn';
    case 'param':
      return 'P';
    case 'variable':
      return '$';
    case 'filter':
      return 'f';
    case 'keyword':
      return 'K';
    case 'trigger':
      return 'T';
    case 'value':
      return 'V';
    default:
      return '?';
  }
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
      <div css={styles.listHeader}>{'Suggested'}</div>
      <div css={styles.listScroll} ref={listRef}>
        {filteredItems.map(({ item, labelHighlightIndices }, i) => {
          const isSelected = i === selectedIndex;
          const segments = highlightSegments(item.label, labelHighlightIndices);

          return (
            <div
              key={`${item.label}-${i}`}
              css={[styles.listItem, isSelected && styles.listItemSelected]}
              onMouseDown={(e) => handleMouseDown(e, i)}
              onMouseEnter={() => onSelect(i)}
            >
              <span css={[styles.itemIcon, isSelected && styles.itemIconSelected]}>
                {getIconForCategory(item.category)}
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
                {item.category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
