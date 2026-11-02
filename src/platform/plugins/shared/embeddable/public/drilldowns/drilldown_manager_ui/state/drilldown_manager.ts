/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs';
import { useSyncObservable } from '../hooks/use_sync_observable';
import type { DrilldownState } from '../../../../server/drilldowns/types';
import type { DrilldownFactory } from '../types';

export interface DrilldownManagerDeps {
  /**
   * Drilldown factory.
   */
  factory: DrilldownFactory;

  /**
   * List of all triggers provided by the place from where the
   * Drilldown Manager was opened.
   */
  triggers: string[];

  /**
   * Initial drilldown state.
   */
  initialState?: Partial<DrilldownState>;
}

/**
 * An instance of this class represents UI states of a single drilldown which
 * is currently being created or edited.
 */
export class DrilldownManager {
  /**
   * Drilldown definition.
   */
  public readonly factory: DrilldownFactory;

  /**
   * User entered drilldown state.
   */
  public readonly state$: BehaviorSubject<Partial<DrilldownState>>;

  /**
   * List of all triggers from which the user can pick in UI for this specific
   * drilldown. This is the selection list we show to the user. It is an
   * intersection of all triggers supported by current place with the triggers
   * that the action factory supports.
   */
  public readonly uiTriggers: string[];

  /**
   * Whether the drilldown state is in an error and should not be saved. Value
   * is `undefined` when there is no error.
   */
  public readonly error$: Observable<string | undefined>;

  constructor({
    factory,
    triggers,
    // placeContext,
    initialState,
  }: DrilldownManagerDeps) {
    this.factory = factory;
    this.state$ = new BehaviorSubject<Partial<DrilldownState>>(initialState ?? {});

    this.uiTriggers = this.factory.supportedTriggers.filter((t) => triggers.includes(t));

    // Pre-select a trigger if there is only one trigger for user to choose from.
    // In case there is only one possible trigger, UI will not display a trigger picker.
    if (this.uiTriggers.length === 1)
      this.state$.next({
        ...initialState,
        trigger: this.uiTriggers[0],
      });

    this.error$ = this.state$.pipe(
      map((currentState) => {
        if (!currentState.label) return 'NAME_EMPTY';
        if (!currentState.trigger) return 'NO_TRIGGER_SELECTED';
        if (!this.factory.isStateValid(currentState)) return 'INVALID_CONFIG';
        return undefined;
      })
    );
  }

  /**
   * Set drilldown label.
   */
  public readonly setLabel = (label: string): void => {
    this.state$.next({
      ...this.state$.getValue(),
      label,
    });
  };

  /**
   * Change the selected trigger.
   */
  public readonly setTrigger = (trigger: string): void => {
    this.state$.next({
      ...this.state$.getValue(),
      trigger,
    });
  };

  /**
   * Update the current drilldown configuration.
   */
  public readonly setState = (state: Partial<DrilldownState>): void => {
    this.state$.next(state);
  };

  /**
   * Serialize the current drilldown draft into a serializable action which
   * is persisted to disk.
   */
  public serialize(): DrilldownState {
    return {
      label: '',
      trigger: '',
      ...this.state$.getValue(),
      type: this.factory.type,
    };
  }

  public isValid(): boolean {
    const state = this.state$.getValue();
    return Boolean(state.label) && Boolean(state.trigger) && this.factory.isStateValid(state);
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  public readonly useState = () => useObservable(this.state$, this.state$.getValue());
  public readonly useError = () => useSyncObservable(this.error$);
}
