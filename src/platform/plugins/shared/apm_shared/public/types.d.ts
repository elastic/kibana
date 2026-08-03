import type { ComponentType } from 'react';
import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FocusedTraceWaterfallProps, FullTraceWaterfallProps } from '@kbn/apm-types';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { TraceWaterfallProps } from '@kbn/apm-ui-shared';
export interface ApmSharedPluginSetup {
}
export interface ApmSharedPluginStart {
    callApmApi: APMClientV2;
    FocusedTraceWaterfallWithFetching: ComponentType<FocusedTraceWaterfallProps>;
    TraceWaterfallWithFetching: ComponentType<FullTraceWaterfallProps>;
    TraceWaterfall: ComponentType<TraceWaterfallProps>;
}
export interface ApmSharedPluginStartDeps {
    cps?: CPSPluginStart;
}
