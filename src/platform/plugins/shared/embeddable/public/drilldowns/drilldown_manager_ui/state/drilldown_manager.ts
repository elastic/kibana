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
import { BehaviorSubject, combineLatest } from 'rxjs';
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
   * User entered name of this drilldown.
   */
  public readonly name$: BehaviorSubject<string>;

  /**
   * Whether the `name$` is valid or is in an error state.
   */
  public readonly nameError$: Observable<string | undefined>;

  /**
   * List of all triggers from which the user can pick in UI for this specific
   * drilldown. This is the selection list we show to the user. It is an
   * intersection of all triggers supported by current place with the triggers
   * that the action factory supports.
   */
  public readonly uiTriggers: string[];

  /**
   * User selected trigger.
   */
  public readonly trigger$: BehaviorSubject<string | undefined>;

  /**
   * Error identifier, in case `trigger$` is in an error state.
   */
  public readonly triggerError$: Observable<string | undefined>;

  /**
   * Current drilldown configuration
   */
  public readonly config$: BehaviorSubject<{}>;

  /**
   * Error identifier, in case `config$` is in an error state.
   */
  public readonly configError$: Observable<string | undefined>;

  /**
   * Whether the drilldown state is in an error and should not be saved. I value
   * is `undefined`, there is no error.
   */
  public readonly error$: Observable<string | undefined>;

  constructor({
    factory,
    triggers,
    // placeContext,
    initialState,
  }: DrilldownManagerDeps) {
    this.factory = factory;
    // this.placeContext = placeContext;
    const { label, trigger, type, ...config } = initialState ?? {};
    this.name$ = new BehaviorSubject<string>(label ?? '');
    this.trigger$ = new BehaviorSubject<string | undefined>(trigger);
    this.config$ = new BehaviorSubject<Partial<DrilldownState>>(config);

    this.uiTriggers = this.factory.supportedTriggers.filter((t) => triggers.includes(t));

    // Pre-select a trigger if there is only one trigger for user to choose from.
    // In case there is only one possible trigger, UI will not display a trigger picker.
    if (this.uiTriggers.length === 1) this.trigger$.next(this.uiTriggers[0]);

    this.nameError$ = this.name$.pipe(
      map((currentName) => {
        if (!currentName) return 'NAME_EMPTY';
        return undefined;
      })
    );

    this.triggerError$ = this.trigger$.pipe(
      map((currentTrigger) => {
        if (!currentTrigger) return 'NO_TRIGGER_SELECTED';
        return undefined;
      })
    );

    this.configError$ = this.config$.pipe(
      map((currentConfig) => {
        if (!this.factory.isStateValid(currentConfig)) return 'INVALID_CONFIG';
        return undefined;
      })
    );

    this.error$ = combineLatest([this.nameError$, this.triggerError$, this.configError$]).pipe(
      map(
        ([nameError, configError, triggerError]) =>
          nameError || triggerError || configError || undefined
      )
    );
  }

  /**
   * Change the name of the drilldown.
   */
  public readonly setName = (name: string): void => {
    this.name$.next(name);
  };

  /**
   * Change the selected trigger.
   */
  public readonly setTrigger = (trigger: string): void => {
    this.trigger$.next(trigger);
  };

  /**
   * Update the current drilldown configuration.
   */
  public readonly setConfig = (state: Partial<DrilldownState>): void => {
    const { label, type, trigger, ...config } = state;
    this.config$.next(config);
  };

  /*
  public getFactoryContext(): BaseActionFactoryContext {
    return {
      ...this.placeContext,
      triggers: this.triggers$.getValue(),
    };
  }
  */

  /**
   * Serialize the current drilldown draft into a serializable action which
   * is persisted to disk.
   */
  public serialize(): DrilldownState {
    return {
      ...this.config$.getValue(),
      label: this.name$.getValue(),
      trigger: this.trigger$.getValue()!,
      type: this.factory.type,
    };
  }

  public isValid(): boolean {
    if (!this.name$.getValue()) return false;
    if (!this.trigger$.getValue()) return false;
    return this.factory.isStateValid(this.config$.getValue());
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  public readonly useName = () => useObservable(this.name$, this.name$.getValue());
  public readonly useTrigger = () => useObservable(this.trigger$, this.trigger$.getValue());
  public readonly useConfig = () => useObservable(this.config$, this.config$.getValue());
  public readonly useError = () => useSyncObservable(this.error$);
}
