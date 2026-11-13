/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { InspectMode } from './types';

/**
 * The mode that is currently active, shared by every button and shortcut so that only one
 * overlay can be on at a time.
 */
export const activeMode$ = new BehaviorSubject<InspectMode | null>(null);

/** Turns the mode off when it is active, otherwise makes it the active mode, replacing any other. */
export const toggleActiveMode = (mode: InspectMode): void => {
  activeMode$.next(activeMode$.getValue() === mode ? null : mode);
};

/** Turns the mode off, unless another mode has taken over in the meantime. */
export const deactivateMode = (mode: InspectMode): void => {
  if (activeMode$.getValue() === mode) {
    activeMode$.next(null);
  }
};

export const useActiveMode = (): InspectMode | null =>
  useObservable(activeMode$, activeMode$.getValue());
