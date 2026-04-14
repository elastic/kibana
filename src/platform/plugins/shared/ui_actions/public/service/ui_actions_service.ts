/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncMap } from '@kbn/std';
import type { Trigger, ActionRegistry, TriggerToActionsRegistry } from '../types';
import type { Action, ActionDefinition, FrequentCompatibilityChangeAction } from '../actions';
import { ActionInternal } from '../actions';
import { UiActionsExecutionService } from './ui_actions_execution_service';
import { triggers } from '../triggers';

export interface UiActionsServiceParams {
  readonly actions?: ActionRegistry;

  /**
   * A 1-to-N mapping from `Trigger` to zero or more `Action`.
   */
  readonly triggerToActions?: TriggerToActionsRegistry;
}

export class UiActionsService {
  public readonly executionService = new UiActionsExecutionService();
  protected readonly actions: ActionRegistry;
  protected readonly triggerToActions: TriggerToActionsRegistry;

  constructor({ actions = new Map(), triggerToActions = new Map() }: UiActionsServiceParams = {}) {
    this.actions = actions;
    this.triggerToActions = triggerToActions;
  }

  public readonly getTrigger = (triggerId: string): Trigger => {
    const trigger = triggers[triggerId];

    if (!trigger) {
      throw new Error(`Trigger [triggerId = ${triggerId}] does not exist.`);
    }

    return trigger;
  };

  /**
   * @deprecated
   *
   * Use `plugins.uiActions.registerActionAsync` instead.
   */
  public readonly registerAction = <Context extends object>(
    definition: ActionDefinition<Context>
  ): Action<Context> => {
    if (this.actions.has(definition.id)) {
      throw new Error(`Action [action.id = ${definition.id}] already registered.`);
    }

    const action = new ActionInternal(definition);

    this.actions.set(action.id, async () => action as unknown as ActionInternal<object>);

    return action;
  };

  public readonly registerActionAsync = <Context extends object>(
    id: string,
    getDefinition: () => Promise<ActionDefinition<Context>>
  ) => {
    if (this.actions.has(id)) {
      throw new Error(`Action [action.id = ${id}] already registered.`);
    }

    this.actions.set(id, async () => {
      const action = new ActionInternal(await getDefinition());
      return action as unknown as ActionInternal<object>;
    });
  };

  public readonly unregisterAction = (actionId: string): void => {
    if (!this.actions.has(actionId)) {
      throw new Error(`Action [action.id = ${actionId}] is not registered.`);
    }

    this.actions.delete(actionId);
  };

  public readonly hasAction = (actionId: string): boolean => {
    return this.actions.has(actionId);
  };

  public readonly attachAction = (triggerId: string, actionId: string): void => {
    const trigger = triggers[triggerId];

    if (!trigger) {
      throw new Error(
        `No trigger [triggerId = ${triggerId}] exists, for attaching action [actionId = ${actionId}].`
      );
    }

    const actionIds = this.triggerToActions.get(triggerId) ?? [];

    if (!actionIds.find((id) => id === actionId)) {
      this.triggerToActions.set(triggerId, [...actionIds, actionId]);
    }
  };

  public readonly detachAction = (triggerId: string, actionId: string) => {
    const trigger = triggers[triggerId];

    if (!trigger) {
      throw new Error(
        `No trigger [triggerId = ${triggerId}] exists, for detaching action [actionId = ${actionId}].`
      );
    }

    const actionIds = this.triggerToActions.get(triggerId);

    this.triggerToActions.set(
      triggerId,
      actionIds!.filter((id) => id !== actionId)
    );
  };

  /**
   * @deprecated
   *
   * Use `plugins.uiActions.addTriggerActionAsync` instead.
   */
  public readonly addTriggerAction = (triggerId: string, action: ActionDefinition<any>): void => {
    if (!this.actions.has(action.id)) this.registerAction(action);
    this.attachAction(triggerId, action.id);
  };

  /**
   * `addTriggerAction` is similar to `attachAction` as it attaches action to a
   * trigger, but it also registers the action, if it has not been registered, yet.
   */
  public readonly addTriggerActionAsync = (
    triggerId: string,
    actionId: string,
    getDefinition: () => Promise<ActionDefinition<any>>
  ): void => {
    if (!this.actions.has(actionId)) this.registerActionAsync(actionId, getDefinition);
    this.attachAction(triggerId, actionId);
  };

  public readonly getAction = async (id: string): Promise<Action> => {
    const getAction = this.actions.get(id);
    if (!getAction) {
      throw new Error(`Action [action.id = ${id}] not registered.`);
    }

    return (await getAction()) as Action;
  };

  public readonly getTriggerActions = async (triggerId: string): Promise<Action[]> => {
    // This line checks if trigger exists, otherwise throws.
    this.getTrigger!(triggerId);

    const actionIds = this.triggerToActions.get(triggerId) ?? [];

    const actions = await asyncMap(
      actionIds,
      async (actionId) => (await this.actions.get(actionId)?.()) as ActionInternal
    );

    return actions.filter(Boolean);
  };

  public readonly getTriggerCompatibleActions = async (
    triggerId: string,
    context: object
  ): Promise<Action[]> => {
    const actions = await this.getTriggerActions(triggerId);
    const isCompatibles = await Promise.all(
      actions.map((action) =>
        action.isCompatible({
          ...context,
          trigger: this.getTrigger(triggerId),
        })
      )
    );
    return actions.reduce((acc: Action[], action, i) => {
      if (isCompatibles[i]) {
        acc.push(action);
      }
      return acc;
    }, []);
  };

  public readonly getFrequentlyChangingActionsForTrigger = async (
    triggerId: string,
    context: object
  ): Promise<FrequentCompatibilityChangeAction[]> => {
    return (await this.getTriggerActions(triggerId)).filter((action) => {
      return (
        Boolean(action.getCompatibilityChangesSubject) &&
        action.couldBecomeCompatible?.({
          ...context,
          trigger: this.getTrigger(triggerId),
        })
      );
    }) as FrequentCompatibilityChangeAction[];
  };

  public readonly executeTriggerActions = async (
    triggerId: string,
    context: object,
    alwaysShowPopup?: boolean
  ) => {
    const trigger = this.getTrigger(triggerId);

    const actions = await this.getTriggerCompatibleActions(triggerId, context);

    await Promise.all([
      actions.map((action) =>
        this.executionService.execute(
          {
            action,
            context,
            trigger,
          },
          alwaysShowPopup
        )
      ),
    ]);
  };

  /**
   * Removes all registered triggers and actions.
   */
  public readonly clear = () => {
    this.actions.clear();
    this.triggerToActions.clear();
  };

  /**
   * "Fork" a separate instance of `UiActionsService` that inherits all existing
   * triggers and actions, but going forward all new triggers and actions added
   * to this instance of `UiActionsService` are only available within this instance.
   */
  public readonly fork = (): UiActionsService => {
    const actions: ActionRegistry = new Map();
    const triggerToActions: TriggerToActionsRegistry = new Map();

    for (const [key, value] of this.actions.entries()) actions.set(key, value);
    for (const [key, value] of this.triggerToActions.entries())
      triggerToActions.set(key, [...value]);
    return new UiActionsService({ actions, triggerToActions });
  };
}
