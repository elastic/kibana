/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core/public';
import type { FocusedTraceWaterfallProps } from '@kbn/apm-types';
import type { APMClientV2 } from '@kbn/apm-api-shared';

const LazyFocusedTraceWaterfallRendererComponent = dynamic(() =>
  import('./focused_trace_waterfall_renderer').then((mod) => ({
    default: mod.FocusedTraceWaterfallRenderer,
  }))
);

export function createLazyFocusedTraceWaterfallRenderer({
  core,
  callApmApi,
}: {
  core: CoreStart;
  callApmApi: APMClientV2;
}) {
  return (props: FocusedTraceWaterfallProps) => {
    return (
      <LazyFocusedTraceWaterfallRendererComponent {...props} core={core} callApmApi={callApmApi} />
    );
  };
}
