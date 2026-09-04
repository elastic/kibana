/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { getUsageCollectionStart } from '../services';

interface ReportVegaRenderParams {
  /** The application hosting the visualization, e.g. `dashboard`. Nothing is reported without it. */
  containerType: string | undefined;
  isVegaLite: boolean;
  useMap: boolean;
}

/**
 * Reports the `render_vega*` UI counters for a completed Vega render. Shared by the legacy
 * expression renderer and the dedicated Dashboard embeddable so both entry points produce the same
 * counters; each resolves `containerType` through its own API.
 */
export const reportVegaRender = ({
  containerType,
  isVegaLite,
  useMap,
}: ReportVegaRenderParams): void => {
  const usageCollection = getUsageCollectionStart();

  if (!usageCollection || !containerType) {
    return;
  }

  const counterEvents = ['render_vega', `render_vega_${isVegaLite ? 'lite' : 'normal'}`];
  if (useMap) {
    counterEvents.push('render_vega_map');
  }

  usageCollection.reportUiCounter(containerType, METRIC_TYPE.COUNT, counterEvents);
};
