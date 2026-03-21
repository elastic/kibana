import type { BaseConnectorContract } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
/**
 * Connector input schemas
 */
export declare const ConnectorSpecsInputSchemas: Map<string, Record<string, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
export declare const ConnectorInputSchemas: Map<string, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
export declare const ConnectorActionInputSchemas: Map<string, Record<string, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
/**
 * Connector output schemas
 */
export declare const ConnectorOutputSchemas: Map<string, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
export declare const ConnectorActionOutputSchemas: Map<string, Record<string, z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>>;
/**
 * Static connectors used for schema generation
 */
export declare const staticConnectors: BaseConnectorContract[];
