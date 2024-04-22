/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Trigger } from '@kbn/ui-actions-browser/src/triggers';
import { TriggerRegistry, ActionRegistry, TriggerToActionsRegistry } from '../types';
import {
  ActionInternal,
  Action,
  ActionDefinition,
  FrequentCompatibilityChangeAction,
} from '../actions';
import { TriggerInternal } from '../triggers/trigger_internal';
import { TriggerContract } from '../triggers/trigger_contract';
import { UiActionsExecutionService } from './ui_actions_execution_service';

export interface UiActionsServiceParams {
  readonly triggers?: TriggerRegistry;
  readonly actions?: ActionRegistry;

  /**
   * A 1-to-N mapping from `Trigger` to zero or more `Action`.
   */
  readonly triggerToActions?: TriggerToActionsRegistry;
}

export class UiActionsService {
  public readonly executionService = new UiActionsExecutionService();
  protected readonly triggers: TriggerRegistry;
  protected readonly actions: ActionRegistry;
  protected readonly triggerToActions: TriggerToActionsRegistry;

  constructor({
    triggers = new Map(),
    actions = new Map(),
    triggerToActions = new Map(),
  }: UiActionsServiceParams = {}) {
    this.triggers = triggers;
    this.actions = actions;
    this.triggerToActions = triggerToActions;
  }

  public readonly registerTrigger = (trigger: Trigger) => {
    if (this.triggers.has(trigger.id)) {
      throw new Error(`Trigger [trigger.id = ${trigger.id}] already registered.`);
    }

    const triggerInternal = new TriggerInternal(this, trigger);

    this.triggers.set(trigger.id, triggerInternal);
    this.triggerToActions.set(trigger.id, []);
  };

  public readonly hasTrigger = (triggerId: string): boolean => {
    return Boolean(this.triggers.get(triggerId));
  };

  public readonly getTrigger = (triggerId: string): TriggerContract => {
    const trigger = this.triggers.get(triggerId);

    if (!trigger) {
      throw new Error(`Trigger [triggerId = ${triggerId}] does not exist.`);
    }

    return trigger.contract;
  };

  public readonly registerAction = <Context extends object>(
    definition: ActionDefinition<Context>
  ): Action<Context> => {
    if (this.actions.has(definition.id)) {
      throw new Error(`Action [action.id = ${definition.id}] already registered.`);
    }

    const action = new ActionInternal(definition);

    this.actions.set(action.id, action as unknown as ActionInternal<object>);

    return action;
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
    const trigger = this.triggers.get(triggerId);

    if (!trigger) {
      throw new Error(
        `No trigger [triggerId = ${triggerId}] exists, for attaching action [actionId = ${actionId}].`
      );
    }

    const actionIds = this.triggerToActions.get(triggerId);

    if (!actionIds!.find((id) => id === actionId)) {
      this.triggerToActions.set(triggerId, [...actionIds!, actionId]);
    }
  };

  public readonly detachAction = (triggerId: string, actionId: string) => {
    const trigger = this.triggers.get(triggerId);

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
   * `addTriggerAction` is similar to `attachAction` as it attaches action to a
   * trigger, but it also registers the action, if it has not been registered, yet.
   */
  public readonly addTriggerAction = (triggerId: string, action: ActionDefinition<any>): void => {
    if (!this.actions.has(action.id)) this.registerAction(action);
    this.attachAction(triggerId, action.id);
  };

  public readonly getAction = (id: string): Action => {
    if (!this.actions.has(id)) {
      throw new Error(`Action [action.id = ${id}] not registered.`);
    }

    return this.actions.get(id)! as Action;
  };

  public readonly getTriggerActions = (triggerId: string): Action[] => {
    // This line checks if trigger exists, otherwise throws.
    this.getTrigger!(triggerId);

    const actionIds = this.triggerToActions.get(triggerId);

    const actions = actionIds!
      .map((actionId) => this.actions.get(actionId) as ActionInternal)
      .filter(Boolean);

    return actions as Action[];
  };

  public readonly getTriggerCompatibleActions = async (
    triggerId: string,
    context: object
  ): Promise<Action[]> => {
    const actions = this.getTriggerActions!(triggerId);
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

  public readonly getFrequentlyChangingActionsForTrigger = (
    triggerId: string,
    context: object
  ): FrequentCompatibilityChangeAction[] => {
    return this.getTriggerActions!(triggerId).filter((action) => {
      return (
        Boolean(action.subscribeToCompatibilityChanges) &&
        action.couldBecomeCompatible?.({
          ...context,
          trigger: this.getTrigger(triggerId),
        })
      );
    }) as FrequentCompatibilityChangeAction[];
  };

  /**
   * @deprecated
   *
   * Use `plugins.uiActions.getTrigger(triggerId).exec(params)` instead.
   */
  public readonly executeTriggerActions = async (triggerId: string, context: object) => {
    const trigger = this.getTrigger(triggerId);
    await trigger.exec(context);
  };

  /**
   * Removes all registered triggers and actions.
   */
  public readonly clear = () => {
    this.actions.clear();
    this.triggers.clear();
    this.triggerToActions.clear();
  };

  /**
   * "Fork" a separate instance of `UiActionsService` that inherits all existing
   * triggers and actions, but going forward all new triggers and actions added
   * to this instance of `UiActionsService` are only available within this instance.
   */
  public readonly fork = (): UiActionsService => {
    const triggers: TriggerRegistry = new Map();
    const actions: ActionRegistry = new Map();
    const triggerToActions: TriggerToActionsRegistry = new Map();

    for (const [key, value] of this.triggers.entries()) triggers.set(key, value);
    for (const [key, value] of this.actions.entries()) actions.set(key, value);
    for (const [key, value] of this.triggerToActions.entries())
      triggerToActions.set(key, [...value]);
    return new UiActionsService({ triggers, actions, triggerToActions });
  };
}
