import type { DataView } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { VisParams } from '@kbn/visualizations-common';
import type { PercentageModeConfig } from '../../common/convert_to_lens';
import type { Vis } from '../types';
import type { Schemas } from '../vis_schemas';
export declare const getColumnsFromVis: <TVisParams extends VisParams>(vis: Vis<TVisParams>, timefilter: TimefilterContract, dataView: DataView, { splits, buckets, unsupported, }?: {
    splits?: Array<keyof Schemas>;
    buckets?: Array<keyof Schemas>;
    unsupported?: Array<keyof Schemas>;
}, config?: ({
    dropEmptyRowsInDateHistogram?: boolean;
    supportMixedSiblingPipelineAggs?: boolean;
} & (void | PercentageModeConfig)) | undefined, series?: Array<{
    metrics: string[];
}>) => {
    metrics: string[];
    buckets: {
        all: string[];
        customBuckets: Record<string, string>;
    };
    bucketCollapseFn: Record<"min" | "max" | "avg" | "sum", string[]>;
    columnsWithoutReferenced: import("../../common").AggBasedColumn[];
    columns: import("../../common").AggBasedColumn[];
}[] | null;
