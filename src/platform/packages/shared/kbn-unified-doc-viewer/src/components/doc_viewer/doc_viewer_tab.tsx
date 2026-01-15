/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import type { DocViewerComponent, DocViewRenderProps } from '../../types';
import type { DocViewerProps } from './doc_viewer';

interface Props {
  id: string;
  renderProps: DocViewRenderProps;
  title: string;
  component: DocViewerComponent;
  initialDocViewerState?: DocViewerProps['initialDocViewerState'];
  onInitialDocViewerStateChange?: DocViewerProps['onInitialDocViewerStateChange'];
}

type ExtractState<T> = T extends DocViewerComponent<infer TState> ? Partial<TState> : never;

/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export const DocViewerTab = (props: Props) => {
  const {
    id,
    component: Component,
    renderProps,
    title,
    initialDocViewerState,
    onInitialDocViewerStateChange,
  } = props;

  const onInitialStateChange = useCallback(
    (initialState: ExtractState<typeof Component>) => {
      onInitialDocViewerStateChange?.({ ...initialDocViewerState, [id]: initialState });
    },
    [id, initialDocViewerState, onInitialDocViewerStateChange]
  );

  return (
    <KibanaSectionErrorBoundary sectionName={title}>
      <Component
        initialState={initialDocViewerState?.[id] as ExtractState<typeof Component>}
        onInitialStateChange={onInitialStateChange}
        {...renderProps}
      />
    </KibanaSectionErrorBoundary>
  );
};
