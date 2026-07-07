/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FullTraceWaterfallProps } from '@kbn/apm-types';
import type { CoreStart } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';

const LazyTraceWaterfallWithFetchingComponent = dynamic(() =>
  import('./trace_waterfall_with_fetching').then((mod) => ({
    default: mod.TraceWaterfallWithFetching,
  }))
);

export function createLazyTraceWaterfallWithFetching({
  core,
  callApmApi,
}: {
  core: CoreStart;
  callApmApi: APMClientV2;
}) {
  return (props: FullTraceWaterfallProps) => {
    return (
      <LazyTraceWaterfallWithFetchingComponent {...props} core={core} callApmApi={callApmApi} />
    );
  };
}
