/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useImperativeHandle, useState } from 'react';

import { SuggestWidgetComponent } from './suggest_widget_component';
import type { EnrichedSuggestionItem } from './types';

export interface SuggestWidgetState {
  items: EnrichedSuggestionItem[];
  filterText: string;
  selectedIndex: number;
  isVisible: boolean;
}

export interface SuggestWidgetHandle {
  update: (state: SuggestWidgetState) => void;
}

interface SuggestWidgetRootProps {
  onSelect: (index: number) => void;
  onAccept: (index: number) => void;
}

/**
 * Stateful wrapper that holds the widget state internally.
 * The parent calls `handle.update(state)` imperatively instead of
 * re-rendering the entire React tree via root.render() on every keystroke.
 * This avoids re-creating EuiProvider and re-computing theme on every update.
 */
export const SuggestWidgetRoot = React.forwardRef<SuggestWidgetHandle, SuggestWidgetRootProps>(
  ({ onSelect, onAccept }, ref) => {
    const [state, setState] = useState<SuggestWidgetState>({
      items: [],
      filterText: '',
      selectedIndex: 0,
      isVisible: false,
    });

    const update = useCallback((newState: SuggestWidgetState) => {
      setState(newState);
    }, []);

    useImperativeHandle(ref, () => ({ update }), [update]);

    return (
      <SuggestWidgetComponent
        items={state.items}
        filterText={state.filterText}
        selectedIndex={state.selectedIndex}
        isVisible={state.isVisible}
        onSelect={onSelect}
        onAccept={onAccept}
      />
    );
  }
);

SuggestWidgetRoot.displayName = 'SuggestWidgetRoot';
