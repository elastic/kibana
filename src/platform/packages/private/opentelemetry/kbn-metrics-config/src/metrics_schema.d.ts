import { type Type } from '@kbn/config-schema';
import type { MetricsExporterConfig, MetricsConfig } from './types';
export declare const metricsExporterConfigSchema: Type<MetricsExporterConfig>;
/**
 * The metrics config schema that is exposed by the Telemetry plugin.
 */
export declare const metricsConfigSchema: Type<MetricsConfig>;
