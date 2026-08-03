import type { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { ExtendedColumnConverterArgs, FormulaColumn } from '../convert';
export declare const getPercentageColumnFormulaColumn: ({ agg, aggs, dataView, visType, }: ExtendedColumnConverterArgs<METRIC_TYPES>) => FormulaColumn | null;
