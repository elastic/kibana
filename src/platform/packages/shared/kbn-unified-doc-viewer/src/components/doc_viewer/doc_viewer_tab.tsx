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
import { useRestorableState } from './restorable_state';

interface Props {
  docView: DocView;
  renderProps: DocViewRenderProps;
}

type ExtractState<T> = T extends DocView<infer TState> ? TState | undefined : never;

/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export const DocViewerTab = ({ docView, renderProps }: Props) => {
  const [docViewerTabsState, setDocViewerTabsState] = useRestorableState(
    'docViewerTabsState',
    undefined
  );
  const initialState = docViewerTabsState?.[docView.id] as ExtractState<typeof docView>;

  const onInitialStateChange = useCallback(
    (state: object) => {
      setDocViewerTabsState((prevState) => ({
        ...prevState,
        [docView.id]: state,
      }));
    },
    [docView.id, setDocViewerTabsState]
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
