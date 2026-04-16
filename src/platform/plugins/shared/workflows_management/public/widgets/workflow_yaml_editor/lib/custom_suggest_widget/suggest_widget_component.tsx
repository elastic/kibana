/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';

import { SuggestDetailsPanel } from './suggest_details_panel';
import { getFilteredItems, SuggestListPanel } from './suggest_list_panel';
import { getSuggestWidgetStyles } from './suggest_widget_styles';
import type { EnrichedSuggestionItem } from './types';

interface SuggestWidgetComponentProps {
  items: EnrichedSuggestionItem[];
  filterText: string;
  selectedIndex: number;
  isVisible: boolean;
  onSelect: (index: number) => void;
  onAccept: (index: number) => void;
}

export const SuggestWidgetComponent: React.FC<SuggestWidgetComponentProps> = ({
  items,
  filterText,
  selectedIndex,
  isVisible,
  onSelect,
  onAccept,
}) => {
  const euiThemeContext = useEuiTheme();
  const styles = getSuggestWidgetStyles(euiThemeContext);

  const filteredItems = useMemo(() => getFilteredItems(items, filterText), [items, filterText]);

  const clampedIndex = Math.max(0, Math.min(selectedIndex, filteredItems.length - 1));
  const selectedItem = filteredItems[clampedIndex]?.item ?? null;

  if (!isVisible || filteredItems.length === 0) {
    return <div css={styles.hidden} />;
  }

  return (
    <div css={styles.container}>
      <SuggestListPanel
        filteredItems={filteredItems}
        selectedIndex={clampedIndex}
        onSelect={onSelect}
        onAccept={onAccept}
      />
      <SuggestDetailsPanel item={selectedItem} />
    </div>
  );
};
