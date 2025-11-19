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
import {
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  ignoringGlobalFiltersSchemaRaw,
  layerSettingsSchemaRaw,
  sharedPanelInfoSchema,
} from '../shared';
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
    schema.literal('total'),
    schema.literal('standard_deviation'),
    schema.literal('variance'),
    schema.literal('distinct_count'),
    schema.literal('current_and_last_value'),
  ]),
]);

const yExtendSchema = schema.oneOf([
  schema.object({
    type: schema.literal('full'),
    integer_rounding: schema.maybe(schema.boolean()),
  }),
  // on the UI as "data" - line chart only
  schema.object({
    type: schema.literal('focus'),
  }),
  schema.object({
    type: schema.literal('custom'),
    start: schema.number(),
    end: schema.number(),
    integer_rounding: schema.maybe(schema.boolean()),
  }),
]);
const yScaleSchema = schema.oneOf([
  schema.literal('time'),
  schema.literal('linear'),
  schema.literal('log'),
  schema.literal('sqrt'),
]);

const sharedAxisSchema = {
  title: schema.maybe(
    schema.object({ value: schema.string(), visible: schema.maybe(schema.boolean()) })
  ),
  ticks: schema.maybe(schema.boolean()),
  grid: schema.maybe(schema.boolean()),
  label_orientation: schema.maybe(
    schema.oneOf([
      schema.literal('horizontal'),
      schema.literal('vertical'),
      schema.literal('angled'),
    ])
  ),
};

const yAxisSchema = schema.object({
  ...sharedAxisSchema,
  scale: schema.maybe(yScaleSchema),
  extent: schema.maybe(yExtendSchema),
});

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
};

const sharedLegendSchema = {
  visible: schema.maybe(schema.boolean()),
  statistics: schema.maybe(schema.arrayOf(statisticsSchema)),
  truncate_after_lines: schema.maybe(schema.number({ min: 1, max: 5 })),
};

const xySharedSettings = {
  legend: schema.maybe(
    schema.oneOf([
      schema.object({
        ...sharedLegendSchema,
        inside: schema.maybe(schema.literal(false)),
        position: schema.maybe(
          schema.oneOf([
            schema.literal('top'),
            schema.literal('bottom'),
            schema.literal('left'),
            schema.literal('right'),
          ])
        ),
        size: schema.maybe(
          schema.oneOf([
            schema.literal('small'),
            schema.literal('medium'),
            schema.literal('large'),
            schema.literal('xlarge'),
          ])
        ),
      }),
      schema.object({
        ...sharedLegendSchema,
        inside: schema.literal(true),
        columns: schema.maybe(schema.number({ min: 1, max: 5 })),
        alignment: schema.maybe(
          schema.oneOf([
            schema.literal('top_right'),
            schema.literal('bottom_right'),
            schema.literal('top_left'),
            schema.literal('bottom_left'),
          ])
        ),
      }),
    ])
  ),

  // While these will pass thru for any data layer
  // at runtime only valid ones will be applied
  // @TODO: document this behaviour
  fitting: schema.maybe(
    schema.object({
      type: schema.oneOf([
        schema.literal('None'),
        schema.literal('Zero'),
        schema.literal('Linear'),
        schema.literal('Carry'),
        schema.literal('Lookahead'),
        schema.literal('Average'),
        schema.literal('Nearest'),
      ]),
      dotted: schema.maybe(schema.boolean()),
      endValue: schema.maybe(
        schema.oneOf([schema.literal('None'), schema.literal('Zero'), schema.literal('Nearest')])
      ),
    })
  ),
  axis: schema.maybe(
    schema.object({
      x: schema.maybe(
        schema.object({
          ...sharedAxisSchema,
          extent: schema.maybe(
            schema.oneOf([
              schema.object({
                // on the UI as "data"
                type: schema.literal('full'),
                integer_rounding: schema.maybe(schema.boolean()),
              }),
              schema.object({
                type: schema.literal('custom'),
                start: schema.number(),
                end: schema.number(),
                integer_rounding: schema.maybe(schema.boolean()),
              }),
            ])
          ),
        })
      ),
      left: schema.maybe(yAxisSchema),
      right: schema.maybe(yAxisSchema),
    })
  ),
  decorations: schema.maybe(
    schema.object({
      end_zones: schema.maybe(schema.boolean()),
      current_time_marker: schema.maybe(schema.boolean()),
      point_visibility: schema.maybe(schema.boolean()),
      line_interpolation: schema.maybe(
        schema.oneOf([
          schema.literal('linear'),
          schema.literal('smooth'),
          schema.literal('stepped'),
        ])
      ),
      minimum_bar_height: schema.maybe(
        schema.number({ min: 0, meta: { description: 'The minimum height of bars in pixels' } })
      ),
      show_value_labels: schema.maybe(schema.boolean()),
      fill_opacity: schema.maybe(
        schema.number({
          min: 0,
          max: 2, // for some reason we have charts with opacity > 1
          meta: { description: 'The fill opacity for area charts' },
        })
      ),
      value_labels: schema.maybe(schema.boolean()),
    })
  ),
};

const xyDataLayerSchemaNoESQL = schema.object({
  ...layerSettingsSchemaRaw,
  ...datasetSchema,
  ...xyDataLayerSharedSchema,
  breakdown_by: schema.maybe(
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
  ...layerSettingsSchemaRaw,
  ...datasetEsqlTableSchema,
  ...xyDataLayerSharedSchema,
  breakdown_by: schema.maybe(esqlColumnSchema),
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
  color: schema.maybe(staticColorSchema),
  axis: schema.oneOf([schema.literal('bottom'), schema.literal('left'), schema.literal('right')], {
    defaultValue: 'left',
  }),
};

const referenceLineLayerSchemaNoESQL = schema.object({
  ...layerSettingsSchemaRaw,
  ...datasetSchema,
  type: schema.literal('referenceLines'),
  thresholds: schema.arrayOf(
    mergeAllMetricsWithChartDimensionSchemaWithStaticOps(schema.object(referenceLineLayerShared))
  ),
});
const referenceLineLayerSchemaESQL = schema.object({
  ...layerSettingsSchemaRaw,
  ...datasetEsqlTableSchema,
  type: schema.literal('referenceLines'),
  thresholds: schema.arrayOf(
    schema.allOf([esqlColumnSchema, schema.object(referenceLineLayerShared)])
  ),
});

const annotationEventShared = {
  name: schema.maybe(schema.string({ meta: { description: 'The name of the event' } })),
  color: schema.maybe(staticColorSchema),
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
    schema.oneOf([schema.literal('inside'), schema.literal('outside')], { defaultValue: 'inside' })
  ),
});

const annotationLayerSchema = schema.object({
  ...ignoringGlobalFiltersSchemaRaw,
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
  ...xySharedSettings,
  ...dslOnlyPanelInfoSchema,
  layers: schema.arrayOf(xyLayerSchema, { minSize: 1 }),
});

export type XYState = TypeOf<typeof xyStateSchema>;
export type DataLayerTypeESQL = TypeOf<typeof xyDataLayerSchemaESQL>;
export type DataLayerTypeNoESQL = TypeOf<typeof xyDataLayerSchemaNoESQL>;
export type DataLayerType = DataLayerTypeNoESQL | DataLayerTypeESQL;
export type ReferenceLineLayerTypeESQL = TypeOf<typeof referenceLineLayerSchemaESQL>;
export type ReferenceLineLayerTypeNoESQL = TypeOf<typeof referenceLineLayerSchemaNoESQL>;
export type ReferenceLineLayerType = ReferenceLineLayerTypeNoESQL | ReferenceLineLayerTypeESQL;
export type AnnotationLayerType = TypeOf<typeof annotationLayerSchema>;
export type LayerTypeESQL = DataLayerTypeESQL | ReferenceLineLayerTypeESQL;
export type LayerTypeNoESQL =
  | DataLayerTypeNoESQL
  | ReferenceLineLayerTypeNoESQL
  | AnnotationLayerType;
