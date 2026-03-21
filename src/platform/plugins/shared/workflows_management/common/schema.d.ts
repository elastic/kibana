import type { ConnectorContractUnion, ConnectorTypeInfo, StepPropertyHandler } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
export type WorkflowZodSchemaType = z.infer<ReturnType<typeof getWorkflowZodSchema>>;
export type WorkflowZodSchemaLooseType = z.infer<ReturnType<typeof getWorkflowZodSchemaLoose>>;
export declare const WORKFLOW_ZOD_SCHEMA: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
export declare const WORKFLOW_ZOD_SCHEMA_LOOSE: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
/**
 * Combine static connectors with dynamic Elasticsearch and Kibana connectors
 * Internal implementation - use exported getAllConnectors() instead
 */
export declare function getAllConnectorsInternal(): ConnectorContractUnion[];
export declare function convertDynamicConnectorsToContracts(connectorTypes: Record<string, ConnectorTypeInfo>): ConnectorContractUnion[];
export declare function getCachedAllConnectorsMap(): Map<string, ConnectorContractUnion> | null;
export declare function setCachedAllConnectorsMap(_allConnectors: ConnectorContractUnion[]): void;
export declare function addDynamicConnectorsToCache(dynamicConnectorTypes: Record<string, ConnectorTypeInfo>): void;
export declare function getCachedDynamicConnectorTypes(): Record<string, ConnectorTypeInfo> | null;
export declare function getAllConnectors(): ConnectorContractUnion[];
export declare function getAllConnectorsWithDynamic(dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>): ConnectorContractUnion[];
export declare const getWorkflowZodSchema: (dynamicConnectorTypes: Record<string, ConnectorTypeInfo>, registeredTriggerIds?: string[]) => z.ZodType;
export declare const getWorkflowZodSchemaLoose: (dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>) => z.ZodType;
export declare const getPropertyHandler: (stepType: string, scope: "config" | "input", propertyKey: string) => StepPropertyHandler | null;
