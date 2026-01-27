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
import type { DocView, DocViewRenderProps } from '../../types';
import type { DocViewerProps } from './doc_viewer';

interface Props {
  docView: DocView;
  renderProps: DocViewRenderProps;
  initialDocViewerState?: DocViewerProps['initialDocViewerState'];
  onInitialDocViewerStateChange?: DocViewerProps['onInitialDocViewerStateChange'];
}

type ExtractState<T> = T extends DocView<infer TState> ? TState | undefined : never;

/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export const DocViewerTab = ({
  docView,
  renderProps,
  initialDocViewerState,
  onInitialDocViewerStateChange,
}: Props) => {
  const initialState = initialDocViewerState?.docViewerTabsState?.[docView.id] as ExtractState<
    typeof docView
  >;

  const onInitialStateChange = useCallback(
    (state: object) => {
      onInitialDocViewerStateChange?.({
        ...initialDocViewerState,
        docViewerTabsState: {
          ...initialDocViewerState?.docViewerTabsState,
          [docView.id]: state,
        },
      });
    },
    [docView.id, initialDocViewerState, onInitialDocViewerStateChange]
  );

  return (
    <KibanaSectionErrorBoundary sectionName={docView.title}>
      {docView.render({
        ...renderProps,
        initialState,
        onInitialStateChange,
      })}
    </KibanaSectionErrorBoundary>
  );
};
