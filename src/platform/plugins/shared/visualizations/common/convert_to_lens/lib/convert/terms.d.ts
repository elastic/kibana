import { BUCKET_TYPES } from '@kbn/data-plugin/common';
import type { TermsParams } from '../../types';
import type { CommonBucketConverterArgs, TermsColumn } from './types';
export declare const convertToTermsParams: ({ agg, dataView, aggs, metricColumns, visType, }: CommonBucketConverterArgs<BUCKET_TYPES.TERMS | BUCKET_TYPES.SIGNIFICANT_TERMS>) => TermsParams | null;
export declare const convertToTermsColumn: (aggId: string, { agg, dataView, aggs, metricColumns, visType, }: CommonBucketConverterArgs<BUCKET_TYPES.TERMS | BUCKET_TYPES.SIGNIFICANT_TERMS>, label: string, isSplit: boolean) => TermsColumn | null;
