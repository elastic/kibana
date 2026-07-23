/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/public';
import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';

/**
 * By-value state for the dedicated Dashboard Vega panel. The panel is UI-only: it is not
 * registered as a server embeddable, so it has no runtime schema and is treated as an unmapped
 * panel by the public Dashboard REST API (dropped on read, rejected on write).
 */
export type VegaByValueState = SerializedTitles &
  SerializedTimeRange &
  SerializedDrilldowns & {
    /** The Vega or Vega-Lite specification as an HJSON or JSON string. */
    spec: string;
  };
