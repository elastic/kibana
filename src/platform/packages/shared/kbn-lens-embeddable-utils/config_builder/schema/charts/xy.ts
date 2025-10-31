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
import { collapseBySchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { datasetEsqlTableSchema, datasetSchema } from '../dataset';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
  mergeAllMetricsWithChartDimensionSchemaWithStaticOps,
} from './shared';
import { esqlColumnSchema } from '../metric_ops';
import { colorMappingSchema, staticColorSchema } from '../color';
import { filterSchema } from '../filter';

const statisticsSchema = schema.oneOf([
  schema.oneOf([
    schema.literal('min'),
    schema.literal('max'),
    schema.literal('avg'),
    schema.literal('median'),
    schema.literal('range'),
    schema.literal('last_value'),
    schema.literal('last_non_null_value'),
    schema.literal('first_value'),
    schema.literal('first_non_null_value'),
  ]),
  schema.oneOf([
    schema.literal('difference'),
    schema.literal('difference_percentage'),
    schema.literal('count'),
    schema.literal('sum'),
    schema.literal('standard_deviation'),
    schema.literal('variance'),
    schema.literal('distinct_count'),
    schema.literal('current_or_last_value'),
  ]),
]);

const xyDataLayerSharedSchema = {
  type: schema.oneOf([
    schema.literal('area'),
    schema.literal('area_percentage'),
    schema.literal('area_stacked'),
    schema.literal('bar'),
    schema.literal('bar_horizontal'),
    schema.literal('bar_horizontal_stacked'),
    schema.literal('bar_horizontal_percentage'),
    schema.literal('bar_percentage'),
    schema.literal('bar_stacked'),
    schema.literal('line'),
  ]),
  legend: schema.maybe(
    schema.object({
      visible: schema.maybe(schema.boolean()),
      inside: schema.maybe(schema.boolean()),
      position: schema.maybe(
        schema.oneOf([
          schema.literal('top'),
          schema.literal('bottom'),
          schema.literal('left'),
          schema.literal('right'),
        ])
      ),
      statistics: schema.maybe(schema.arrayOf(statisticsSchema)),
      truncate_after_lines: schema.maybe(schema.number({ min: 1, max: 5 })),
    })
  ),
};

const xyDataLayerSchemaNoESQL = schema.object({
  ...layerSettingsSchema,
  ...datasetSchema,
  ...xyDataLayerSharedSchema,
  breakdownBy: schema.maybe(
    mergeAllBucketsWithChartDimensionSchema(
      schema.object({
        /**
         * Collapse by function. This parameter is used to collapse the
         * metric chart when the number of columns is bigger than the
         * number of columns specified in the columns parameter.
         * Possible values:
         * - 'avg': Collapse by average
         * - 'sum': Collapse by sum
         * - 'max': Collapse by max
         * - 'min': Collapse by min
         * - Do not collapse if not specified
         */
        collapse_by: schema.maybe(collapseBySchema),
        color: schema.maybe(colorMappingSchema),
        aggregate_first: schema.maybe(schema.boolean()),
      })
    )
  ),
  y: schema.arrayOf(
    mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
      schema.object({
        axis: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
        color: schema.maybe(staticColorSchema),
      })
    )
  ),
  x: schema.maybe(mergeAllBucketsWithChartDimensionSchema(schema.object({}))),
});

const xyDataLayerSchemaESQL = schema.object({
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  ...xyDataLayerSharedSchema,
  breakdownBy: schema.maybe(esqlColumnSchema),
  y: schema.arrayOf(
    esqlColumnSchema.extends({
      axis: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
      color: schema.maybe(staticColorSchema),
    })
  ),
  x: schema.maybe(esqlColumnSchema),
});

const referenceLineTextLabelOption = schema.object({
  type: schema.literal('label'),
  text: schema.string(),
});

const referenceLineLayerShared = {
  fill: schema.maybe(schema.oneOf([schema.literal('above'), schema.literal('below')])),
  text: schema.maybe(referenceLineTextLabelOption),
  icon: schema.maybe(
    schema.string({ meta: { description: 'The icon to use for the reference line' } })
  ),
  stroke_width: schema.maybe(
    schema.number({ meta: { description: 'The width of the reference line' } })
  ),
  stroke_dash: schema.maybe(
    schema.oneOf([schema.literal('straight'), schema.literal('dashed'), schema.literal('dotted')], {
      meta: { description: 'The dash style of the reference line' },
    })
  ),
};

const referenceLineLayerSchemaNoESQL = schema.object({
  ...layerSettingsSchema,
  ...datasetSchema,
  type: schema.literal('referenceLines'),
  thresholds: schema.arrayOf(
    mergeAllMetricsWithChartDimensionSchemaWithStaticOps(schema.object(referenceLineLayerShared))
  ),
});
const referenceLineLayerSchemaESQL = schema.object({
  ...layerSettingsSchema,
  ...datasetEsqlTableSchema,
  type: schema.literal('referenceLines'),
  thresholds: schema.arrayOf(
    schema.allOf([esqlColumnSchema, schema.object(referenceLineLayerShared)])
  ),
});

const annotationEventShared = {
  name: schema.maybe(schema.string({ meta: { description: 'The name of the event' } })),
  color: schema.maybe(
    schema.string({ meta: { description: 'The color to assign to the annotation event' } })
  ),
  hidden: schema.maybe(
    schema.boolean({ meta: { description: 'Whether to hide the annotation event' } })
  ),
};

const annotationPointShared = {
  ...annotationEventShared,
  icon: schema.maybe(
    schema.string({ meta: { description: 'The icon to use for the annotation point' } })
  ),
  line: schema.maybe(
    schema.object({
      stroke_width: schema.number({ meta: { description: 'The width of the annotation line' } }),
      stroke_dash: schema.oneOf(
        [schema.literal('straight'), schema.literal('dashed'), schema.literal('dotted')],
        { meta: { description: 'The dash style of the annotation line' } }
      ),
    })
  ),
};

const annotationTextLabelOption = schema.object({
  type: schema.literal('label'),
  text: schema.string(),
});

const annotationTimestampSchema = schema.oneOf([schema.number(), schema.string()]);

const annotationQuery = schema.object({
  ...annotationPointShared,
  type: schema.literal('query'),
  query: filterSchema,
  time_field: schema.string(),
  text: schema.maybe(annotationTextLabelOption),
  extra_fields: schema.maybe(schema.arrayOf(schema.string())),
});
const annotationManualEvent = schema.object({
  ...annotationPointShared,
  type: schema.literal('point'),
  timestamp: annotationTimestampSchema,
  text: schema.maybe(
    schema.oneOf([
      annotationTextLabelOption,
      schema.object({ type: schema.literal('field'), field: schema.string() }),
    ])
  ),
});
const annotationManualRange = schema.object({
  ...annotationEventShared,
  type: schema.literal('range'),
  interval: schema.object({ from: annotationTimestampSchema, to: annotationTimestampSchema }),
  fill: schema.maybe(
    schema.string({ meta: { description: 'The color to assign to the annotation range' } })
  ),
});

const annotationLayerSchema = schema.object({
  ...layerSettingsSchema,
  ...datasetSchema,
  type: schema.literal('annotations'),
  events: schema.arrayOf(
    schema.oneOf([annotationQuery, annotationManualEvent, annotationManualRange])
  ),
});

const xyLayerSchema = schema.oneOf([
  xyDataLayerSchemaNoESQL,
  xyDataLayerSchemaESQL,
  referenceLineLayerSchemaNoESQL,
  referenceLineLayerSchemaESQL,
  annotationLayerSchema,
]);

export const xyStateSchema = schema.object({
  type: schema.literal('xy'),
  ...sharedPanelInfoSchema,
  layers: schema.arrayOf(xyLayerSchema),
});

export type XYState = TypeOf<typeof xyStateSchema>;
