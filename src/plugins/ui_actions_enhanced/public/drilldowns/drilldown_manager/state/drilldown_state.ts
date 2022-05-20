/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ActionFactory,
  BaseActionConfig,
  BaseActionFactoryContext,
  SerializedAction,
} from '../../../dynamic_actions';
import { useSyncObservable } from '../hooks/use_sync_observable';
import { ActionFactoryPlaceContext } from '../types';

export interface DrilldownStateDeps {
  /**
   * Action factory, i.e. drilldown, which we are creating.
   */
  factory: ActionFactory;

  /**
   * List of all triggers the current place supports.
   */
  placeTriggers: string[];

  /**
   * Special opaque context object provided by the place from where the
   * Drilldown Manager was opened.
   */
  placeContext: ActionFactoryPlaceContext<BaseActionFactoryContext>;

  /**
   * Initial name of the drilldown instance.
   */
  name?: string;

  /**
   * Initially selected triggers of the drilldown instance.
   */
  triggers?: string[];

  /**
   * Initial config of the drilldown instance.
   */
  config?: BaseActionConfig;
}

/**
 * An instance of this class represents UI states of a single drilldown which
 * is currently being created or edited.
 */
export class DrilldownState {
  /**
   * Drilldown type used to configure this drilldown.
   */
  public readonly factory: ActionFactory;

  /**
   * Opaque action factory context object excluding the `triggers` attribute.
   */
  public readonly placeContext: ActionFactoryPlaceContext<BaseActionFactoryContext>;

  /**
   * User entered name of this drilldown.
   */
  public readonly name$: BehaviorSubject<string>;

  /**
   * Whether the `name$` is valid or is in an error state.
   */
  public readonly nameError$: Observable<string | undefined>;

  /**
   * List of all triggers the place which opened the Drilldown Manager supports.
   */
  public readonly placeTriggers: string[];

  /**
   * List of all triggers from which the user can pick in UI for this specific
   * drilldown. This is the selection list we show to the user. It is an
   * intersection of all triggers supported by current place with the triggers
   * that the action factory supports.
   */
  public readonly uiTriggers: string[];

  /**
   * User selected triggers. (Currently in UI we support user picking just one trigger).
   */
  public readonly triggers$: BehaviorSubject<string[]>;

  /**
   * Error identifier, in case `triggers$` is in an error state.
   */
  public readonly triggersError$: Observable<string | undefined>;

  /**
   * Current action factory (drilldown) configuration, i.e. drilldown
   * configuration object, which will be serialized and persisted in storage.
   */
  public readonly config$: BehaviorSubject<BaseActionConfig>;

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
    placeTriggers,
    placeContext,
    name = '',
    triggers = [],
    config = {},
  }: DrilldownStateDeps) {
    this.factory = factory;
    this.placeTriggers = placeTriggers;
    this.placeContext = placeContext;
    this.name$ = new BehaviorSubject<string>(name);
    this.triggers$ = new BehaviorSubject<string[]>(triggers);
    this.config$ = new BehaviorSubject<BaseActionConfig>(config);

    const triggersFactorySupports = this.factory.supportedTriggers();
    this.uiTriggers = triggersFactorySupports.filter((trigger) =>
      this.placeTriggers.includes(trigger)
    );

    // Pre-select a trigger if there is only one trigger for user to choose from.
    // In case there is only one possible trigger, UI will not display a trigger picker.
    if (this.uiTriggers.length === 1) this.triggers$.next([this.uiTriggers[0]]);

    this.nameError$ = this.name$.pipe(
      map((currentName) => {
        if (!currentName) return 'NAME_EMPTY';
        return undefined;
      })
    );

    this.triggersError$ = this.triggers$.pipe(
      map((currentTriggers) => {
        if (!currentTriggers.length) return 'NO_TRIGGERS_SELECTED';
        return undefined;
      })
    );

    this.configError$ = this.config$.pipe(
      map((conf) => {
        if (!this.factory.isConfigValid(conf, this.getFactoryContext())) return 'INVALID_CONFIG';
        return undefined;
      })
    );

    this.error$ = combineLatest([this.nameError$, this.triggersError$, this.configError$]).pipe(
      map(
        ([nameError, configError, triggersError]) =>
          nameError || triggersError || configError || undefined
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
   * Change the list of user selected triggers.
   */
  public readonly setTriggers = (triggers: string[]): void => {
    this.triggers$.next(triggers);
  };

  /**
   * Update the current drilldown configuration.
   */
  public readonly setConfig = (config: BaseActionConfig): void => {
    this.config$.next(config);
  };

  public getFactoryContext(): BaseActionFactoryContext {
    return {
      ...this.placeContext,
      triggers: this.triggers$.getValue(),
    };
  }

  /**
   * Serialize the current drilldown draft into a serializable action which
   * is persisted to disk.
   */
  public serialize(): SerializedAction {
    return {
      factoryId: this.factory.id,
      name: this.name$.getValue(),
      config: this.config$.getValue(),
    };
  }

  /**
   * Returns a list of all triggers from which user can pick in UI, for this
   * specific drilldown.
   */
  public getAllDrilldownTriggers(): string[] {
    const triggersFactorySupports = this.factory.supportedTriggers();
    const uiTriggers = triggersFactorySupports.filter((trigger) =>
      this.placeTriggers.includes(trigger)
    );
    return uiTriggers;
  }

  public isValid(): boolean {
    if (!this.name$.getValue()) return false;
    const config = this.config$.getValue();
    if (!config) return false;
    const triggers = this.triggers$.getValue();
    if (triggers.length < 1) return false;
    if (!this.factory.isConfigValid(config, this.getFactoryContext())) return false;
    return true;
  }

  // Below are convenience React hooks for consuming observables in connected
  // React components.

  public readonly useName = () => useObservable(this.name$, this.name$.getValue());
  public readonly useTriggers = () => useObservable(this.triggers$, this.triggers$.getValue());
  public readonly useConfig = () => useObservable(this.config$, this.config$.getValue());
  public readonly useError = () => useSyncObservable(this.error$);
}
