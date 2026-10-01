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
import { VEGA_SUPPORTED_TRIGGERS } from '../../common/constants';

export const getVegaEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return (
    z
      .object({
        ...serializedTitlesSchema.shape,
        ...serializedTimeRangeSchema.shape,
        ...getDrilldownsSchema(VEGA_SUPPORTED_TRIGGERS).shape,
        spec: z
          .discriminatedUnion('format', [
            z.object({
              format: z.literal('hjson'),
              value: z.string().min(1),
            }),
            z.object({
              format: z.literal('json'),
              value: z.looseObject({}),
            }),
          ])
          .meta({
            description:
              'The Vega or Vega-Lite specification. Use `{ "format": "hjson", "value": "<hjson-string>" }` for HJSON (comments and unquoted keys are preserved) or `{ "format": "json", "value": { ... } }` for a JSON object.',
          }),
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
 * See https://github.com/elastic/kibana/issues/287451
 */
export type VegaByValueState = z.output<ReturnType<typeof getVegaEmbeddableSchema>> &
  SerializedDrilldowns;
