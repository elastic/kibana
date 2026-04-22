/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { PublicStepRegistry } from './step_registry';
import type { PublicStepDefinition } from './step_registry/types';
import { registerInternalStepDefinitions } from './steps';
import type { PublicTriggerDefinition } from './trigger_registry';
import { PublicTriggerRegistry } from './trigger_registry';
import { registerInternalTriggerDefinitions } from './triggers';
import type {
  WorkflowsExtensionsPublicPluginSetup,
  WorkflowsExtensionsPublicPluginSetupDeps,
  WorkflowsExtensionsPublicPluginStart,
  WorkflowsExtensionsPublicPluginStartDeps,
} from './types';
import type { StepDocMetadata, TriggerDocMetadata } from '../common';

const TRIGGER_DOC_METADATA_PATH = '/internal/workflows_extensions/trigger_doc_metadata';
const STEP_DOC_METADATA_PATH = '/internal/workflows_extensions/step_doc_metadata';

function toTriggerDocMetadata(def: PublicTriggerDefinition): TriggerDocMetadata {
  return {
    id: def.id,
    title: def.title,
    description: def.description,
    ...(def.documentation && { documentation: def.documentation }),
    ...(def.snippets && { snippets: def.snippets }),
  };
}

function toStepDocMetadata(def: PublicStepDefinition): StepDocMetadata {
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    ...(def.documentation && { documentation: def.documentation }),
  };
}

export class WorkflowsExtensionsPublicPlugin
  implements
    Plugin<
      WorkflowsExtensionsPublicPluginSetup,
      WorkflowsExtensionsPublicPluginStart,
      WorkflowsExtensionsPublicPluginSetupDeps,
      WorkflowsExtensionsPublicPluginStartDeps
    >
{
  private readonly stepRegistry: PublicStepRegistry;
  private readonly triggerRegistry: PublicTriggerRegistry;
  private coreStart: CoreStart | null = null;

  constructor(_initializerContext: PluginInitializerContext) {
    this.stepRegistry = new PublicStepRegistry();
    this.triggerRegistry = new PublicTriggerRegistry();
  }

  public setup(
    _core: CoreSetup,
    _plugins: WorkflowsExtensionsPublicPluginSetupDeps
  ): WorkflowsExtensionsPublicPluginSetup {
    registerInternalStepDefinitions(this.stepRegistry);
    registerInternalTriggerDefinitions(this.triggerRegistry);

    return {
      registerStepDefinition: (definition) => this.stepRegistry.register(definition),
      registerTriggerDefinition: (definition) => this.triggerRegistry.register(definition),
    };
  }

  public start(
    core: CoreStart,
    _plugins: WorkflowsExtensionsPublicPluginStartDeps
  ): WorkflowsExtensionsPublicPluginStart {
    this.coreStart = core;

    return {
      getAllStepDefinitions: () => {
        return this.stepRegistry.getAll();
      },
      getStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.get(stepTypeId);
      },
      hasStepDefinition: (stepTypeId: string) => {
        return this.stepRegistry.has(stepTypeId);
      },
      getAllTriggerDefinitions: () => {
        return this.triggerRegistry.getAll();
      },
      getTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.get(triggerId);
      },
      hasTriggerDefinition: (triggerId: string) => {
        return this.triggerRegistry.has(triggerId);
      },
      isReady: async () => {
        const coreStart = this.coreStart;
        await Promise.all([
          this.stepRegistry.whenReady().then(() => {
            if (coreStart) this.pushStepDocMetadata(coreStart).catch(() => {});
          }),
          this.triggerRegistry.whenReady().then(() => {
            if (coreStart) this.pushTriggerDocMetadata(coreStart).catch(() => {});
          }),
        ]);
      },
    };
  }

  /**
   * Pushes trigger doc metadata to the server so GET trigger_definitions can return it for the docs generator.
   */
  private async pushTriggerDocMetadata(core: CoreStart): Promise<void> {
    const definitions = this.triggerRegistry.getAll();
    if (definitions.length === 0) {
      return;
    }
    const triggers: TriggerDocMetadata[] = definitions.map(toTriggerDocMetadata);
    await core.http.post(TRIGGER_DOC_METADATA_PATH, {
      body: JSON.stringify({ triggers }),
    });
  }

  /**
   * Pushes step doc metadata to the server so GET step_definitions can return it for the docs generator.
   */
  private async pushStepDocMetadata(core: CoreStart): Promise<void> {
    const definitions = this.stepRegistry.getAll();
    if (definitions.length === 0) {
      return;
    }
    const steps: StepDocMetadata[] = definitions.map(toStepDocMetadata);
    await core.http.post(STEP_DOC_METADATA_PATH, {
      body: JSON.stringify({ steps }),
    });
  }

  public stop() {}
}
