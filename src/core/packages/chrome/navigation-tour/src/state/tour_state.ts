/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ReactNode } from 'react';
import type { ElementTarget } from '@elastic/eui';

export interface TourStep {
  id: string;
  title: ReactNode;
  content: ReactNode;
  target: ElementTarget;
}

export interface TourState {
  isActive: boolean;
  currentStepIndex: number;
  steps: TourStep[];
  isCompleted: boolean;
  isSkipped: boolean;
  globalStepOffset: number;
  globalStepsTotal: number;
}

const initialState: TourState = {
  isActive: false,
  currentStepIndex: 0,
  steps: [],
  isCompleted: false,
  isSkipped: false,
  globalStepOffset: 0,
  globalStepsTotal: 0,
};

export class TourStateMachine {
  private _state$ = new BehaviorSubject<TourState>(initialState);

  public readonly state$ = this._state$.asObservable();
  public get state() {
    return this._state$.value;
  }

  startTour(
    steps: TourStep[],
    options?: {
      globalStepOffset?: number;
    }
  ): void {
    this._state$.next({
      isActive: true,
      currentStepIndex: 0,
      steps,
      isCompleted: false,
      isSkipped: false,
      globalStepOffset: options?.globalStepOffset ?? 0,
      globalStepsTotal: steps.length + (options?.globalStepOffset ?? 0),
    });
  }

  nextStep(): void {
    const currentState = this._state$.value;

    if (!currentState.isActive) return;

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
      isActive: false,
      isSkipped: true,
    });
  }

  finishTour(): void {
    const currentState = this._state$.value;

    this._state$.next({
      ...currentState,
      isActive: false,
      isCompleted: true,
    });
  }

  reset(): void {
    this._state$.next(initialState);
  }

  getCurrentStep(): TourStep | null {
    const currentState = this._state$.value;

    if (!currentState.isActive || currentState.steps.length === 0) {
      return null;
    }

    return currentState.steps[currentState.currentStepIndex] || null;
  }

  isLastStep(): boolean {
    const currentState = this._state$.value;
    return currentState.currentStepIndex === currentState.steps.length - 1;
  }

  destroy(): void {
    this._state$.complete();
  }
}
