/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, first, firstValueFrom, map } from 'rxjs';
import type { TourState, TourStepId } from './types';
import { tourSteps } from './tour_config';

const initialState: TourState = {
  status: 'idle',
  currentStepIndex: 0,
  steps: tourSteps,
};

export class TourManager {
  private _state$ = new BehaviorSubject<TourState>(initialState);

  public readonly state$ = this._state$.asObservable();
  public get state() {
    return this._state$.value;
  }

  startTour(enabledSteps: TourStepId[]): void {
    this._state$.next({
      ...this.state,
      steps: tourSteps.filter((step) => enabledSteps.includes(step.id)),
      currentStepIndex: 0,
      status: 'active',
    });
  }

  async waitForTourEnd(): Promise<'completed' | 'skipped'> {
    return firstValueFrom(
      this.state$.pipe(
        first((state) => state.status === 'completed' || state.status === 'skipped'),
        map((state) => state.status as 'completed' | 'skipped')
      )
    );
  }

  nextStep(): void {
    const currentState = this._state$.value;

    if (currentState.status !== 'active') return;

    const nextIndex = currentState.currentStepIndex + 1;

    if (nextIndex >= currentState.steps.length) {
      this.finishTour();
    } else {
      this._state$.next({
        ...currentState,
        currentStepIndex: nextIndex,
      });
    }
  }

  skipTour(): void {
    const currentState = this._state$.value;

    this._state$.next({
      ...currentState,
      status: 'skipped',
    });
  }

  finishTour(): void {
    const currentState = this._state$.value;

    this._state$.next({
      ...currentState,
      status: 'completed',
    });
  }

  reset(): void {
    this._state$.next(initialState);
  }

  isLastStep(): boolean {
    const currentState = this._state$.value;
    return currentState.currentStepIndex === currentState.steps.length - 1;
  }
}
