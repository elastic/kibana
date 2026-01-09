/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

export interface EmbeddedState {
  isByValueEditor(): boolean;
  isEmbeddedEditor(): boolean;
  transferBackToEditor(): void;
}

export function useEmbeddedState() {
  const { embeddable, application } = useDiscoverServices();
  const embeddedTransfer = useRef(embeddable.getStateTransfer());
  const embeddableState = useMemo(
    () => embeddedTransfer.current.getIncomingEditorState('discover'),
    []
  );

  return useMemo(
    () => ({
      isByValueEditor: () => !Boolean(embeddableState?.searchSessionId),
      isEmbeddedEditor: () => Boolean(embeddableState),
      transferBackToEditor: () => {
        if (embeddableState) {
          const app = embeddableState.originatingApp;
          const path = embeddableState.originatingPath;

          if (app && path) {
            embeddedTransfer.current.clearEditorState('discover');
            application.navigateToApp(app, { path });
          }
        }
      },
    }),
    [embeddableState, application]
  );
}
