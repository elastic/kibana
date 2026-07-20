/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type {
  GetDrilldownsSchemaFnType,
  SerializedDrilldowns,
} from '@kbn/embeddable-plugin/server';
import {
  BY_VALUE_SCHEMA_META,
  serializedTimeRangeSchema,
  serializedTitlesSchema,
  type SerializedTitles,
} from '@kbn/presentation-publishing-schemas';
import { VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS } from '../../common/constants';

const vegaStateSchema = schema.object({
  ...serializedTimeRangeSchema.getPropSchemas(),
  spec: schema.string({
    meta: {
      description: 'The Vega or Vega-Lite specification as an HJSON or JSON string.',
    },
  }),
});

export const getVegaByValueSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.allOf(
    [
      getDrilldownsSchema(VEGA_EMBEDDABLE_SUPPORTED_TRIGGERS),
      serializedTitlesSchema,
      vegaStateSchema,
    ],
    { meta: BY_VALUE_SCHEMA_META }
  );

export type VegaByValueState = TypeOf<typeof vegaStateSchema> &
  SerializedTitles &
  SerializedDrilldowns;
