import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
import type { PublicStepDefinition, WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import type { ServerStepDefinition, WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
type WorkflowsExtensions = WorkflowsExtensionsPublicPluginStart | WorkflowsExtensionsServerPluginStart;
/**
 * StepSchemas singleton class that manages state and caches.
 * IMPORTANT: This class is loaded into the main bundle to be initialized during plugin startup.
 * All heavy logic (connector generation, schema processing, dependencies) should stay in schema.ts to keep
 * this file lightweight and allow synchronous import in plugin.ts.
 */
declare class StepSchemas {
    private workflowsExtensions;
    private allConnectorsCache;
    private allConnectorsMapCache;
    private dynamicConnectorTypesCache;
    private lastProcessedConnectorTypesHash;
    /**
     * Initialize the singleton with workflowExtensions.
     * Must be called during plugin initialization.
     */
    initialize(workflowsExtensions: WorkflowsExtensions): void;
    /**
     * Get the workflowExtensions instance.
     * Throws if not initialized.
     */
    getAllRegisteredStepDefinitions(): PublicStepDefinition[] | ServerStepDefinition[];
    getStepDefinition(stepTypeId: string): PublicStepDefinition | ServerStepDefinition | undefined;
    /**
     * Helper function to check if a step definition is a public step definition
     */
    isPublicStepDefinition(stepDefinition: ServerStepDefinition | PublicStepDefinition): stepDefinition is PublicStepDefinition;
    getAllConnectorsCache(): ConnectorContractUnion[] | null;
    setAllConnectorsCache(cache: ConnectorContractUnion[] | null): void;
    getAllConnectorsMapCache(): Map<string, ConnectorContractUnion> | null;
    setAllConnectorsMapCache(cache: Map<string, ConnectorContractUnion> | null): void;
    getDynamicConnectorTypesCache(): Record<string, ConnectorTypeInfo> | null;
    setDynamicConnectorTypesCache(cache: Record<string, ConnectorTypeInfo> | null): void;
    getLastProcessedConnectorTypesHash(): string | null;
    setLastProcessedConnectorTypesHash(hash: string | null): void;
}
/**
 * StepSchemas singleton instance
 */
export declare const stepSchemas: StepSchemas;
export type { StepSchemas };
