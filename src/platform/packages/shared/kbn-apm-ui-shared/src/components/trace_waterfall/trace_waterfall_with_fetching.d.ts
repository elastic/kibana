import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FullTraceWaterfallProps } from '@kbn/apm-types';
import type { CoreStart } from '@kbn/core/public';
import React from 'react';
type Props = FullTraceWaterfallProps & {
    core: CoreStart;
    callApmApi: APMClientV2;
};
export declare function TraceWaterfallWithFetching({ traceId, rangeFrom, rangeTo, serviceName, scrollElement, onNodeClick, onErrorClick, core, ebt, callApmApi, getErrorMarkerHref, ...scrollProps }: Props): React.JSX.Element;
export {};
