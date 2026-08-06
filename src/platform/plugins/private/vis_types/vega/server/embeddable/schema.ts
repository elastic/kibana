/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type {
  GetDrilldownsSchemaFnType,
  SerializedDrilldowns,
} from '@kbn/embeddable-plugin/server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';

const VEGA_SUPPORTED_DRILLDOWN_TRIGGERS = [ON_APPLY_FILTER, ON_OPEN_PANEL_MENU];

export const getVegaEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return (
    z
      .object({
        ...serializedTitlesSchema.shape,
        ...serializedTimeRangeSchema.shape,
        ...getDrilldownsSchema(VEGA_SUPPORTED_DRILLDOWN_TRIGGERS).shape,
        spec: z
          .string()
          .min(1)
          .meta({ description: 'The Vega or Vega-Lite specification as an HJSON or JSON string.' }),
      })
      // Strip unknown keys for forward-compatible additive changes in this public contract.
      .strip()
      .meta({
        id: 'kbn-vega-embeddable',
        title: 'Vega',
        description: 'Vega by-value embeddable state schema.',
      })
  );
};

/**
 * NOTE: `vis_types/vega` compiles with `strictNullChecks: false`, which can make the Zod-inferred
 * drilldowns output type incompatible with `SerializedDrilldowns` (e.g. `trigger` becomes optional).
 */
export type VegaByValueState = z.output<ReturnType<typeof getVegaEmbeddableSchema>> &
  SerializedDrilldowns;
