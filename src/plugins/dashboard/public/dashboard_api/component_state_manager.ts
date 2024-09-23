/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from "rxjs";

/**
 * Component state is non-persisted runtime state
 */
export function initializeComponentStateManager() {
  const animatePanelTransforms$ = new BehaviorSubject<boolean>(false); // set panel transforms to false initially to avoid panels animating on initial render.
  return {
    api: {
      animatePanelTransforms$,
    },
    setters: {
      setAnimatePanelTransforms: (next: boolean) => animatePanelTransforms$.next(next),
    }
  };
}