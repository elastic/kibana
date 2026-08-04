import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FocusedTraceWaterfallProps, WaterfallGetErrorMarkerHref } from '@kbn/apm-types';
import type { CoreStart } from '@kbn/core/public';
import React from 'react';
interface Props extends FocusedTraceWaterfallProps {
    core: CoreStart;
    callApmApi: APMClientV2;
    getErrorMarkerHref?: WaterfallGetErrorMarkerHref;
}
export declare function FocusedTraceWaterfallWithFetching({ traceId, rangeFrom, rangeTo, docId, core, callApmApi, getErrorMarkerHref, }: Props): React.JSX.Element;
export {};
