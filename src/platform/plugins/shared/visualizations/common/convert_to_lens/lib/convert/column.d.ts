import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { AggId, FormatParams } from '../../types';
import type { SchemaConfig } from '../../../types';
import type { ExtraColumnFields, GeneralColumnWithMeta } from './types';
export declare const createAggregationId: (agg: SchemaConfig) => AggId;
export declare const getFormat: () => FormatParams;
export declare const createColumn: (agg: SchemaConfig, field?: DataViewField, { isBucketed, isSplit, reducedTimeRange }?: ExtraColumnFields) => GeneralColumnWithMeta;
