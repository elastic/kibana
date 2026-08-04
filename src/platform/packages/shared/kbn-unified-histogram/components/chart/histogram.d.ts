import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EmbeddableComponentProps, LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramBucketInterval, UnifiedHistogramChartContext, UnifiedHistogramServices, UnifiedHistogramVisContext } from '../../types';
import type { LensProps } from './hooks/use_lens_props';
export interface HistogramProps {
    abortController: AbortController | undefined;
    services: UnifiedHistogramServices;
    dataView: DataView;
    chart: UnifiedHistogramChartContext;
    bucketInterval: UnifiedHistogramBucketInterval | undefined;
    isPlainRecord: boolean;
    requestData: string;
    lensProps: LensProps;
    visContext: UnifiedHistogramVisContext;
    disableTriggers?: LensEmbeddableInput['disableTriggers'];
    disabledActions?: LensEmbeddableInput['disabledActions'];
    onFilter?: LensEmbeddableInput['onFilter'];
    onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
    withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];
}
export declare function Histogram({ services: { lens, uiSettings }, dataView, chart: { timeInterval }, bucketInterval, isPlainRecord, requestData, lensProps, visContext, disableTriggers, disabledActions, onFilter, onBrushEnd, withDefaultActions, abortController, }: HistogramProps): React.JSX.Element;
