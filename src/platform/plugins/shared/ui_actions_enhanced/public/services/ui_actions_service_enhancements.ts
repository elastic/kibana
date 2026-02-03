/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement } from 'react';
import type { SerializableRecord } from '@kbn/utility-types';
import type { ILicense } from '@kbn/licensing-types';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DrilldownDefinition } from '../drilldowns';
import type {
  ActionFactoryDefinition,
  BaseActionConfig,
  BaseActionFactoryContext,
} from '../dynamic_actions';
import { ActionFactory } from '../dynamic_actions';
import type { ActionFactoryRegistry } from '../types';

import type { DynamicActionsState } from '../../common/types';

export type { DynamicActionsState };

export interface UiActionsServiceEnhancementsParams {
  readonly actionFactories?: ActionFactoryRegistry;
  readonly getLicense?: () => ILicense;
  readonly featureUsageSetup?: LicensingPluginSetup['featureUsage'];
  readonly getFeatureUsageStart: () => LicensingPluginStart['featureUsage'] | undefined;
}

export class UiActionsServiceEnhancements {
  protected readonly actionFactories: ActionFactoryRegistry;
  protected readonly deps: Omit<UiActionsServiceEnhancementsParams, 'actionFactories'>;

  constructor({ actionFactories = new Map(), ...deps }: UiActionsServiceEnhancementsParams) {
    this.actionFactories = actionFactories;
    this.deps = deps;
  }

  /**
   * Register an action factory. Action factories are used to configure and
   * serialize/deserialize dynamic actions.
   */
  public readonly registerActionFactory = <
    Config extends BaseActionConfig = BaseActionConfig,
    ExecutionContext extends object = object,
    FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
  >(
    definition: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>
  ) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    const actionFactory = new ActionFactory<Config, ExecutionContext, FactoryContext>(
      definition,
      this.deps
    );

    this.actionFactories.set(
      actionFactory.id,
      actionFactory as unknown as ActionFactory<
        SerializableRecord,
        object,
        BaseActionFactoryContext
      >
    );
    this.registerFeatureUsage(definition as unknown as ActionFactoryDefinition);
  };

  public readonly getActionFactory = (actionFactoryId: string): ActionFactory => {
    const actionFactory = this.actionFactories.get(actionFactoryId);

    if (!actionFactory) {
      throw new Error(`Action factory [actionFactoryId = ${actionFactoryId}] does not exist.`);
    }

    return actionFactory;
  };

  public readonly hasActionFactory = (actionFactoryId: string): boolean => {
    return this.actionFactories.has(actionFactoryId);
  };

  /**
   * Returns an array of all action factories.
   */
  public readonly getActionFactories = (): ActionFactory[] => {
    return [...this.actionFactories.values()];
  };

  /**
   * Convenience method to register a {@link DrilldownDefinition | drilldown}.
   */
  public readonly registerDrilldown = <
    Config extends BaseActionConfig = BaseActionConfig,
    ExecutionContext extends object = object,
    FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
  >({
    id: factoryId,
    isBeta,
    order,
    CollectConfig,
    createConfig,
    isConfigValid,
    getDisplayName,
    actionMenuItem,
    euiIcon,
    execute,
    getHref,
    minimalLicense,
    licenseFeatureName,
    supportedTriggers,
    isCompatible,
    isConfigurable,
  }: DrilldownDefinition<Config, ExecutionContext, FactoryContext>): void => {
    const actionFactory: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext> = {
      id: factoryId,
      isBeta,
      minimalLicense,
      licenseFeatureName,
      order,
      CollectConfig,
      createConfig,
      isConfigValid,
      getDisplayName,
      supportedTriggers,
      getIconType: () => euiIcon,
      isCompatible: async (context) => !isConfigurable || isConfigurable(context),
      create: (serializedAction) => ({
        id: '',
        type: factoryId,
        getIconType: () => euiIcon,
        getDisplayName: () => serializedAction.name,
        MenuItem: actionMenuItem
          ? ({ context }) => createElement(actionMenuItem, { context, config: serializedAction })
          : undefined,
        execute: async (context) => await execute(serializedAction.config, context),
        getHref: getHref ? async (context) => getHref(serializedAction.config, context) : undefined,
        isCompatible: isCompatible
          ? async (context) => isCompatible(serializedAction.config, context)
          : undefined,
      }),
    } as ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>;

    this.registerActionFactory(actionFactory);
  };

  private registerFeatureUsage = (definition: ActionFactoryDefinition): void => {
    if (!definition.minimalLicense || !definition.licenseFeatureName) return;
    if (this.deps.featureUsageSetup) {
      this.deps.featureUsageSetup.register(
        definition.licenseFeatureName,
        definition.minimalLicense
      );
    }
  };
}
