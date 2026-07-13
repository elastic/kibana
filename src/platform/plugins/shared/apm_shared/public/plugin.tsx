/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';
import type { CoreStart, Plugin } from '@kbn/core/public';
import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FocusedTraceWaterfallProps, FullTraceWaterfallProps } from '@kbn/apm-types';
import { dynamic } from '@kbn/shared-ux-utility';
import type { TraceWaterfallProps } from '@kbn/apm-ui-shared';
import type { ApmSharedPluginSetup, ApmSharedPluginStart, ApmSharedPluginStartDeps } from './types';
import {
  OBSERVABILITY_APM_CPS_ENABLED_DEFAULT,
  OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
} from '.';

const LazyFocusedTraceWaterfallWithFetching = dynamic(() =>
  import('@kbn/apm-ui-shared').then((mod) => ({
    default: mod.FocusedTraceWaterfallWithFetching,
  }))
);

const LazyTraceWaterfallWithFetching = dynamic(() =>
  import('@kbn/apm-ui-shared').then((mod) => ({
    default: mod.TraceWaterfallWithFetching,
  }))
);

const LazyTraceWaterfall = dynamic(() =>
  import('@kbn/apm-ui-shared').then((mod) => ({
    default: mod.TraceWaterfall,
  }))
);

const LazyLoading = dynamic(() =>
  import('@kbn/apm-ui-shared').then((mod) => ({ default: mod.Loading }))
);

const LoadingFallback = () => (
  <Suspense fallback={null}>
    <LazyLoading />
  </Suspense>
);

export class ApmSharedPlugin
  implements Plugin<ApmSharedPluginSetup, ApmSharedPluginStart, {}, ApmSharedPluginStartDeps>
{
  public setup(): ApmSharedPluginSetup {
    return {};
  }

  public start(core: CoreStart, { cps }: ApmSharedPluginStartDeps): ApmSharedPluginStart {
    const isCpsEnabled = core.featureFlags.getBooleanValue(
      OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG,
      OBSERVABILITY_APM_CPS_ENABLED_DEFAULT
    );

    // lazy proxy: APMClientV2 already returns a Promise, so this is type-compatible
    let _api: APMClientV2 | undefined;
    const callApmApi: APMClientV2 = ((endpoint: any, options: any) => {
      if (_api) return _api(endpoint, options);
      return import('@kbn/apm-api-shared').then(({ createCallApmApiV2 }) => {
        _api = createCallApmApiV2(core, {
          cpsManager: isCpsEnabled ? cps?.cpsManager : undefined,
        });
        return _api(endpoint, options);
      });
    }) as APMClientV2;

    const FocusedTraceWaterfallWithFetching = (props: FocusedTraceWaterfallProps) => (
      <Suspense fallback={<LoadingFallback />}>
        <LazyFocusedTraceWaterfallWithFetching {...props} core={core} callApmApi={callApmApi} />
      </Suspense>
    );

    const TraceWaterfallWithFetching = (props: FullTraceWaterfallProps) => (
      <Suspense fallback={<LoadingFallback />}>
        <LazyTraceWaterfallWithFetching {...props} core={core} callApmApi={callApmApi} />
      </Suspense>
    );

    const TraceWaterfall = (props: TraceWaterfallProps) => (
      <Suspense fallback={<LoadingFallback />}>
        <LazyTraceWaterfall {...props} />
      </Suspense>
    );

    return {
      callApmApi,
      TraceWaterfallWithFetching,
      FocusedTraceWaterfallWithFetching,
      TraceWaterfall,
    };
  }

  public stop() {}
}
