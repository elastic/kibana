import type { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { SchemaConfig } from './types';
export declare function convertToSchemaConfig(agg: IAggConfig): SchemaConfig<METRIC_TYPES>;
