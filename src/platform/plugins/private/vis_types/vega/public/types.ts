/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { VEGA_EVENT_APPLY_FILTER } from './constants';

/**
 * An event raised by a rendered Vega view for its parent to act on, emitted when a spec calls the
 * `kibanaAddFilter` or `kibanaSetTimeFilter` Vega expression functions. That is the only event
 * `VegaBaseView` emits.
 */
export interface VegaEvent {
  name: typeof VEGA_EVENT_APPLY_FILTER;
  data: { filters: Filter[]; timeFieldName?: string };
}

export type VegaEventHandler = (event: VegaEvent) => void;
