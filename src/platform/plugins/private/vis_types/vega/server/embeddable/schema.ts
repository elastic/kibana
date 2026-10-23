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
  BY_REF_SCHEMA_META,
  BY_VALUE_SCHEMA_META,
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { VEGA_SUPPORTED_TRIGGERS } from '../../common/constants';
import { vegaFiltersSchema, vegaQuerySchema, vegaSpecSchema } from '../api/schema';

const getPanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  z.object({
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
    ...getDrilldownsSchema(VEGA_SUPPORTED_TRIGGERS).shape,
  });

const getVegaByValueEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  getPanelSchema(getDrilldownsSchema)
    .extend({
      query: vegaQuerySchema.meta({
        description:
          'Panel-level KQL or Lucene query. Applied together with the dashboard query to Elasticsearch and ES|QL data sources that use `%context%: true`, and to Elasticsearch data sources that use `%dashboard_context-*%` placeholders.',
      }),
      filters: vegaFiltersSchema.meta({
        description:
          'Panel-level filters. Applied together with the dashboard filters to Elasticsearch and ES|QL data sources that use `%context%: true`, and to Elasticsearch data sources that use `%dashboard_context-*%` placeholders.',
      }),
      spec: vegaSpecSchema,
    })
    // Strip unknown keys for forward-compatible additive changes in this public contract.
    .strip();

// The library item owns the query and filters, like the spec.
const getVegaByReferenceEmbeddableSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  getPanelSchema(getDrilldownsSchema)
    .extend({
      ref_id: z.string().meta({ description: 'The ID of the Vega library item.' }),
    })
    .strip()
    .meta(BY_REF_SCHEMA_META);

/**
 * Returns the by-value schema, or the union of the by-value and by-reference schemas when Vega
 * library items can be used on dashboards.
 */
export const getVegaEmbeddableSchema = (
  getDrilldownsSchema: GetDrilldownsSchemaFnType,
  byReferenceEnabled = false
) => {
  const byValueSchema = getVegaByValueEmbeddableSchema(getDrilldownsSchema);
  if (!byReferenceEnabled) {
    return byValueSchema.meta({
      id: 'kbn-vega-embeddable',
      title: 'Vega',
      description: 'Vega by-value embeddable state schema.',
    });
  }
  return z
    .union([
      byValueSchema.meta(BY_VALUE_SCHEMA_META),
      getVegaByReferenceEmbeddableSchema(getDrilldownsSchema),
    ])
    .meta({ id: 'kbn-vega-embeddable', title: 'Vega', description: 'Vega panel config.' });
};

/**
 * NOTE: `vis_types/vega` compiles with `strictNullChecks: false`, which can make the Zod-inferred
 * drilldowns output type incompatible with `SerializedDrilldowns` (e.g. `trigger` becomes optional).
 * See https://github.com/elastic/kibana/issues/287451
 */
export type VegaByValueState = z.output<ReturnType<typeof getVegaByValueEmbeddableSchema>> &
  SerializedDrilldowns;

export type VegaByReferenceState = z.output<ReturnType<typeof getVegaByReferenceEmbeddableSchema>> &
  SerializedDrilldowns;

export type VegaEmbeddableState = VegaByValueState | VegaByReferenceState;
