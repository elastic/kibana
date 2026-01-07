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
import type { DocViewComponent, DocViewRenderProps } from '../../types';
import type { DocViewerProps } from './doc_viewer';

interface Props
  extends Pick<DocViewerProps, 'initialDocViewState' | 'onInitialDocViewStateChange'> {
  id: string;
  renderProps: DocViewRenderProps;
  title: string;
  component: DocViewComponent;
}

type ExtractState<T> = T extends DocViewComponent<infer S> ? S : never;

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
    initialDocViewState,
    onInitialDocViewStateChange,
  } = props;

  const onInitialStateChange = useCallback(
    (initialState: ExtractState<typeof Component>) => {
      onInitialDocViewStateChange?.({ ...initialDocViewState, [id]: initialState });
    },
    [id, initialDocViewState, onInitialDocViewStateChange]
  );

  return (
    <KibanaSectionErrorBoundary sectionName={title}>
      <Component
        initialState={initialDocViewState?.[id] as ExtractState<typeof Component>}
        onInitialStateChange={onInitialStateChange}
        {...renderProps}
      />
    </KibanaSectionErrorBoundary>
  );
};
