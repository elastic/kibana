import type { TimeRange } from '@kbn/data-plugin/common';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { EmbeddableComponentProps, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { UnifiedHistogramFetch$ } from '../../../types';
export type LensProps = Pick<EmbeddableComponentProps, 'id' | 'viewMode' | 'timeRange' | 'attributes' | 'esqlVariables' | 'noPadding' | 'searchSessionId' | 'executionContext' | 'onLoad' | 'lastReloadRequestTime'>;
export declare const useLensProps: ({ fetch$, onLoad, }: {
    fetch$: UnifiedHistogramFetch$;
    onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
}) => {
    requestData: string;
    lensProps: LensProps;
} | undefined;
export declare const getLensProps: ({ searchSessionId, timeRange, attributes, esqlVariables, onLoad, lastReloadRequestTime, }: {
    searchSessionId: string | undefined;
    timeRange: TimeRange;
    attributes: TypedLensByValueInput["attributes"];
    esqlVariables: ESQLControlVariable[] | undefined;
    onLoad: (isLoading: boolean, adapters: Partial<DefaultInspectorAdapters> | undefined) => void;
    lastReloadRequestTime?: number;
}) => LensProps;
