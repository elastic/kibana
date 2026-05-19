import type { CountIndexPatternColumn, CardinalityIndexPatternColumn, SumIndexPatternColumn, MaxIndexPatternColumn, MinIndexPatternColumn, StandardDeviationIndexPatternColumn, MedianIndexPatternColumn, AvgIndexPatternColumn, StaticValueIndexPatternColumn, FormulaIndexPatternColumn, LastValueIndexPatternColumn, PercentileIndexPatternColumn, PercentileRanksIndexPatternColumn, MovingAverageIndexPatternColumn, DerivativeIndexPatternColumn, CounterRateIndexPatternColumn, CumulativeSumIndexPatternColumn, DateHistogramIndexPatternColumn, FiltersIndexPatternColumn, RangeIndexPatternColumn, TermsIndexPatternColumn } from '@kbn/lens-common';
export type AnyMetricLensStateColumn = CountIndexPatternColumn | CardinalityIndexPatternColumn | SumIndexPatternColumn | MaxIndexPatternColumn | MinIndexPatternColumn | StandardDeviationIndexPatternColumn | MedianIndexPatternColumn | AvgIndexPatternColumn | StaticValueIndexPatternColumn | FormulaIndexPatternColumn | LastValueIndexPatternColumn | PercentileIndexPatternColumn | PercentileRanksIndexPatternColumn | MovingAverageIndexPatternColumn | DerivativeIndexPatternColumn | CounterRateIndexPatternColumn | CumulativeSumIndexPatternColumn;
export type ReferableMetricLensStateColumn = CountIndexPatternColumn | CardinalityIndexPatternColumn | SumIndexPatternColumn | MaxIndexPatternColumn | MinIndexPatternColumn | StandardDeviationIndexPatternColumn | MedianIndexPatternColumn | AvgIndexPatternColumn | LastValueIndexPatternColumn | PercentileIndexPatternColumn | PercentileRanksIndexPatternColumn;
export type AnyBucketLensStateColumn = DateHistogramIndexPatternColumn | FiltersIndexPatternColumn | RangeIndexPatternColumn | TermsIndexPatternColumn;
export type AnyLensStateColumn = AnyMetricLensStateColumn | AnyBucketLensStateColumn;
export type ReferenceMetricLensStateColumn = Exclude<AnyLensStateColumn, ReferableMetricLensStateColumn | AnyBucketLensStateColumn>;
export interface APIDataView {
    type: 'dataView';
    id: string;
}
export interface APIAdHocDataView {
    type: 'adHocDataView';
    index: string;
    timeFieldName: string | undefined;
    dataSourceType?: string;
    esqlQuery?: string;
}
