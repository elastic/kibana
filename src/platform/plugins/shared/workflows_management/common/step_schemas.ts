/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
import type {
  PublicStepDefinition,
  WorkflowsExtensionsPublicPluginStart,
} from '@kbn/workflows-extensions/public';
import type {
  ServerStepDefinition,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

type WorkflowsExtensions =
  | WorkflowsExtensionsPublicPluginStart
  | WorkflowsExtensionsServerPluginStart;

/**
 * StepSchemas singleton class that manages state and caches.
 * IMPORTANT: This class is loaded into the main bundle to be initialized during plugin startup.
 * All heavy logic (connector generation, schema processing, dependencies) should stay in schema.ts to keep
 * this file lightweight and allow synchronous import in plugin.ts.
 */
class StepSchemas {
  private workflowsExtensions: WorkflowsExtensions | null = null;
  private allConnectorsCache: ConnectorContractUnion[] | null = null;
  private allConnectorsMapCache: Map<string, ConnectorContractUnion> | null = null;
  private dynamicConnectorTypesCache: Record<string, ConnectorTypeInfo> | null = null;
  private lastProcessedConnectorTypesHash: string | null = null;

  /**
   * Initialize the singleton with workflowExtensions.
   * Must be called during plugin initialization.
   */
  public initialize(workflowsExtensions: WorkflowsExtensions): void {
    this.workflowsExtensions = workflowsExtensions;
  }

  /**
   * Get the workflowExtensions instance.
   * Throws if not initialized.
   */
  public getAllRegisteredStepDefinitions(): PublicStepDefinition[] | ServerStepDefinition[] {
    return this.workflowsExtensions?.getAllStepDefinitions() ?? [];
  }

  public getStepDefinition(
    stepTypeId: string
  ): PublicStepDefinition | ServerStepDefinition | undefined {
    return this.workflowsExtensions?.getStepDefinition(stepTypeId);
  }

  /**
   * Helper function to check if a step definition is a public step definition
   */
  public isPublicStepDefinition(
    stepDefinition: ServerStepDefinition | PublicStepDefinition
  ): stepDefinition is PublicStepDefinition {
    return 'label' in stepDefinition;
  }

  // Cache getters and setters
  public getAllConnectorsCache(): ConnectorContractUnion[] | null {
    return this.allConnectorsCache;
  }

  public setAllConnectorsCache(cache: ConnectorContractUnion[] | null): void {
    this.allConnectorsCache = cache;
  }

  public getAllConnectorsMapCache(): Map<string, ConnectorContractUnion> | null {
    return this.allConnectorsMapCache;
  }

  public setAllConnectorsMapCache(cache: Map<string, ConnectorContractUnion> | null): void {
    this.allConnectorsMapCache = cache;
  }

  public getDynamicConnectorTypesCache(): Record<string, ConnectorTypeInfo> | null {
    return this.dynamicConnectorTypesCache;
  }

  public setDynamicConnectorTypesCache(cache: Record<string, ConnectorTypeInfo> | null): void {
    this.dynamicConnectorTypesCache = cache;
  }

  public getLastProcessedConnectorTypesHash(): string | null {
    return this.lastProcessedConnectorTypesHash;
  }

  public setLastProcessedConnectorTypesHash(hash: string | null): void {
    this.lastProcessedConnectorTypesHash = hash;
  }
}

/**
 * StepSchemas singleton instance
 */
export const stepSchemas = new StepSchemas();
export type { StepSchemas };
