import type { ConnectorParamsSchemaResolver } from '@kbn/workflows-yaml';
/**
 * Resolves the Zod params schema for a given step/connector type from the
 * plugin's connector catalog. Used to inject connector-aware enrichment into
 * the connector-agnostic validation utilities exported from
 * `@kbn/workflows-yaml`.
 */
export declare const connectorParamsSchemaResolver: ConnectorParamsSchemaResolver;
