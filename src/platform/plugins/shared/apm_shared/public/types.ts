/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';
import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FocusedTraceWaterfallProps, FullTraceWaterfallProps } from '@kbn/apm-types';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { TraceWaterfallProps } from '@kbn/apm-ui-shared';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApmSharedPluginSetup {}

export interface ApmSharedPluginStart {
  callApmApi: APMClientV2;
  FocusedTraceWaterfallWithFetching: ComponentType<FocusedTraceWaterfallProps>;
  TraceWaterfallWithFetching: ComponentType<FullTraceWaterfallProps>;
  TraceWaterfall: ComponentType<TraceWaterfallProps>;
}

export interface ApmSharedPluginStartDeps {
  cps?: CPSPluginStart;
}
