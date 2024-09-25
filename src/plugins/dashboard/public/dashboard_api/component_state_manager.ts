/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

export interface InitialComponentState {
  isEmbeddedExternally: boolean;
  managed: boolean;
}

/**
 * Non-persisted runtime state
 */
export function initializeComponentStateManager(initialComponentState: InitialComponentState) {
  const animatePanelTransforms$ = new BehaviorSubject(false); // set panel transforms to false initially to avoid panels animating on initial render.
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const managed$ = new BehaviorSubject(initialComponentState.managed);
  return {
    animatePanelTransforms$,
    hasUnsavedChanges$,
    isEmbeddedExternally: initialComponentState.isEmbeddedExternally,
    managed$,
    setAnimatePanelTransforms: (animate: boolean) => animatePanelTransforms$.next(animate),
    setHasUnsavedChanges: (hasUnsavedChanges: boolean) =>
      hasUnsavedChanges$.next(hasUnsavedChanges),
    setManaged: (managed: boolean) => managed$.next(managed),
  };
}
