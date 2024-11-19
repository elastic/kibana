/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identity } from 'lodash';
import { CoreSetup, Plugin } from '@kbn/core/server';
import { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { dynamicActionEnhancement } from './dynamic_action_enhancement';
import { ActionFactoryRegistry, SerializedEvent, ActionFactoryDefinition } from './types';

export interface UiActionsEnhancedServerSetup {
  registerActionFactory: (definition: ActionFactoryDefinition) => void;
}

export type UiActionsEnhancedServerStart = void;

interface UiActionsEnhancedServerSetupDependencies {
  embeddable: EmbeddableSetup; // Embeddable are needed because they register basic triggers/actions.
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UiActionsEnhancedServerStartDependencies {}

export class AdvancedUiActionsServerPlugin
  implements
    Plugin<
      UiActionsEnhancedServerSetup,
      UiActionsEnhancedServerStart,
      UiActionsEnhancedServerSetupDependencies,
      UiActionsEnhancedServerStartDependencies
    >
{
  protected readonly actionFactories: ActionFactoryRegistry = new Map();

  constructor() {}

  public setup(_core: CoreSetup, { embeddable }: UiActionsEnhancedServerSetupDependencies) {
    const getActionFactory = (actionFactoryId: string) => this.actionFactories.get(actionFactoryId);

    embeddable.registerEnhancement(dynamicActionEnhancement(getActionFactory));

    return {
      registerActionFactory: this.registerActionFactory,
    };
  }

  public start() {}

  public stop() {}

  /**
   * Register an action factory. Action factories are used to configure and
   * serialize/deserialize dynamic actions.
   */
  public readonly registerActionFactory = (definition: ActionFactoryDefinition) => {
    if (this.actionFactories.has(definition.id)) {
      throw new Error(`ActionFactory [actionFactory.id = ${definition.id}] already registered.`);
    }

    this.actionFactories.set(definition.id, {
      id: definition.id,
      telemetry: definition.telemetry || ((state, stats) => stats),
      inject: definition.inject || identity,
      extract:
        definition.extract ||
        ((state: SerializedEvent) => {
          return { state, references: [] };
        }),
      migrations: definition.migrations || {},
    });
  };
}
