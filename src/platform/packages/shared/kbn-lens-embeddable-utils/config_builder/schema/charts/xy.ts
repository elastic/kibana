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

/**
 * Statistical functions that can be displayed in chart legend for data series
 */
const statisticsSchema = schema.oneOf(
  [
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
  ],
  {
    meta: {
      description: 'Statistical functions that can be displayed in chart legend for data series',
    },
  }
);

/**
 * Y-axis extent configuration defining how the axis bounds are calculated
 */
const yExtendSchema = schema.oneOf(
  [
    schema.object(
      {
        type: schema.literal('full'),
        integer_rounding: schema.maybe(schema.boolean()),
      },
      { meta: { description: 'Full extent mode with optional integer rounding' } }
    ),
    schema.object(
      {
        type: schema.literal('focus'),
      },
      { meta: { description: 'Focus mode for tighter data bounds' } }
    ),
    schema.object(
      {
        type: schema.literal('custom'),
        start: schema.number({ meta: { description: 'Custom axis start value' } }),
        end: schema.number({ meta: { description: 'Custom axis end value' } }),
        integer_rounding: schema.maybe(schema.boolean()),
      },
      { meta: { description: 'Custom extent with explicit bounds' } }
    ),
  ],
  {
    meta: {
      description: 'Y-axis extent configuration defining how the axis bounds are calculated',
    },
  }
);

/**
 * Y-axis scale type for data transformation
 */
const yScaleSchema = schema.oneOf(
  [schema.literal('time'), schema.literal('linear'), schema.literal('log'), schema.literal('sqrt')],
  { meta: { description: 'Y-axis scale type for data transformation' } }
);

/**
 * Common axis configuration properties shared across X and Y axes
 */
const sharedAxisSchema = {
  title: schema.maybe(
    schema.object(
      {
        value: schema.string({ meta: { description: 'Axis title text' } }),
        visible: schema.maybe(schema.boolean()),
      },
      { meta: { description: 'Axis title configuration' } }
    )
  ),
  ticks: schema.maybe(
    schema.boolean({ meta: { description: 'Whether to show tick marks on the axis' } })
  ),
  grid: schema.maybe(
    schema.boolean({ meta: { description: 'Whether to show grid lines for this axis' } })
  ),
  label_orientation: schema.maybe(
    schema.oneOf(
      [schema.literal('horizontal'), schema.literal('vertical'), schema.literal('angled')],
      { meta: { description: 'Orientation of the axis labels' } }
    )
  ),
};

/**
 * Complete Y-axis configuration including scale and extent
 */
const yAxisSchema = schema.object(
  {
    ...sharedAxisSchema,
    scale: schema.maybe(yScaleSchema),
    extent: schema.maybe(yExtendSchema),
  },
  { meta: { description: 'Y-axis configuration with scale and bounds' } }
);

/**
 * Chart types available for data layers in XY visualizations
 */
const xyDataLayerSharedSchema = {
  type: schema.oneOf(
    [
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
    ],
    { meta: { description: 'Chart type for the data layer' } }
  ),
};

/**
 * Common legend configuration properties for positioning and statistics
 */
const sharedLegendSchema = {
  visible: schema.maybe(schema.boolean({ meta: { description: 'Whether to show the legend' } })),
  statistics: schema.maybe(
    schema.arrayOf(statisticsSchema, { meta: { description: 'Statistics to display in legend' } })
  ),
  truncate_after_lines: schema.maybe(
    schema.number({ min: 1, max: 5, meta: { description: 'Maximum lines before truncation' } })
  ),
};

/**
 * Shared settings that apply to the entire XY chart visualization
 */
const xySharedSettings = {
  legend: schema.maybe(
    schema.oneOf([
      schema.object(
        {
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
        },
        { meta: { description: 'External legend positioned outside the chart' } }
      ),
      schema.object(
        {
          ...sharedLegendSchema,
          inside: schema.literal(true),
          columns: schema.maybe(
            schema.number({ min: 1, max: 5, meta: { description: 'Number of legend columns' } })
          ),
          alignment: schema.maybe(
            schema.oneOf(
              [
                schema.literal('top_right'),
                schema.literal('bottom_right'),
                schema.literal('top_left'),
                schema.literal('bottom_left'),
              ],
              { meta: { description: 'Legend alignment inside the chart' } }
            )
          ),
        },
        { meta: { description: 'Internal legend positioned inside the chart' } }
      ),
    ])
  ),

  fitting: schema.maybe(
    schema.object(
      {
        type: schema.oneOf(
          [
            schema.literal('None'),
            schema.literal('Zero'),
            schema.literal('Linear'),
            schema.literal('Carry'),
            schema.literal('Lookahead'),
            schema.literal('Average'),
            schema.literal('Nearest'),
          ],
          { meta: { description: 'Fitting function type for missing data' } }
        ),
        dotted: schema.maybe(
          schema.boolean({ meta: { description: 'Show fitted values as dotted lines' } })
        ),
        endValue: schema.maybe(
          schema.oneOf([schema.literal('None'), schema.literal('Zero'), schema.literal('Nearest')])
        ),
      },
      {
        meta: {
          description:
            'Missing data interpolation configuration (only valid fitting types applied per chart type)',
        },
      }
    )
  ),
  axis: schema.maybe(
    schema.object(
      {
        x: schema.maybe(
          schema.object(
            {
              ...sharedAxisSchema,
              extent: schema.maybe(
                schema.oneOf([
                  schema.object(
                    {
                      type: schema.literal('full'),
                      integer_rounding: schema.maybe(schema.boolean()),
                    },
                    { meta: { description: 'Full extent mode for X-axis' } }
                  ),
                  schema.object(
                    {
                      type: schema.literal('custom'),
                      start: schema.number({ meta: { description: 'Custom X-axis start value' } }),
                      end: schema.number({ meta: { description: 'Custom X-axis end value' } }),
                      integer_rounding: schema.maybe(schema.boolean()),
                    },
                    { meta: { description: 'Custom X-axis extent' } }
                  ),
                ])
              ),
            },
            { meta: { description: 'X-axis (horizontal) configuration' } }
          )
        ),
        left: schema.maybe(yAxisSchema),
        right: schema.maybe(yAxisSchema),
      },
      { meta: { description: 'Axis configuration for X, left Y, and right Y axes' } }
    )
  ),
  decorations: schema.maybe(
    schema.object(
      {
        end_zones: schema.maybe(
          schema.boolean({ meta: { description: 'Show end zones for partial buckets' } })
        ),
        current_time_marker: schema.maybe(
          schema.boolean({ meta: { description: 'Show current time marker line' } })
        ),
        point_visibility: schema.maybe(
          schema.boolean({ meta: { description: 'Show data points on lines' } })
        ),
        line_interpolation: schema.maybe(
          schema.oneOf([
            schema.literal('linear'),
            schema.literal('smooth'),
            schema.literal('stepped'),
          ])
        ),
        minimum_bar_height: schema.maybe(
          schema.number({ min: 0, meta: { description: 'Minimum bar height in pixels' } })
        ),
        show_value_labels: schema.maybe(
          schema.boolean({ meta: { description: 'Display value labels on data points' } })
        ),
        fill_opacity: schema.maybe(
          schema.number({
            min: 0,
            max: 2,
            meta: { description: 'Area chart fill opacity (0-1 typical, max 2 for legacy)' },
          })
        ),
        value_labels: schema.maybe(
          schema.boolean({ meta: { description: 'Show value labels (alternative property)' } })
        ),
      },
      { meta: { description: 'Visual enhancements and styling options for the chart' } }
    )
  ),
};

/**
 * Data layer configuration for standard (non-ES|QL) queries with breakdown and metrics
 */
const xyDataLayerSchemaNoESQL = schema.object(
  {
    ...layerSettingsSchemaRaw,
    ...datasetSchema,
    ...xyDataLayerSharedSchema,
    breakdown_by: schema.maybe(
      mergeAllBucketsWithChartDimensionSchema(
        schema.object(
          {
            collapse_by: schema.maybe(collapseBySchema),
            color: schema.maybe(colorMappingSchema),
            aggregate_first: schema.maybe(
              schema.boolean({
                meta: { description: 'Whether to aggregate before splitting series' },
              })
            ),
          },
          { meta: { description: 'Split series configuration with color mapping' } }
        )
      )
    ),
    y: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps(
        schema.object(
          {
            axis: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
            color: schema.maybe(staticColorSchema),
          },
          { meta: { description: 'Y-axis metric configuration with axis assignment' } }
        )
      ),
      { meta: { description: 'Array of metrics to display on Y-axis' } }
    ),
    x: schema.maybe(
      mergeAllBucketsWithChartDimensionSchema(
        schema.object({}, { meta: { description: 'X-axis bucket configuration' } })
      )
    ),
  },
  { meta: { description: 'Data layer for standard queries with metrics and buckets' } }
);

/**
 * Data layer configuration for ES|QL queries with column-based metrics
 */
const xyDataLayerSchemaESQL = schema.object(
  {
    ...layerSettingsSchemaRaw,
    ...datasetEsqlTableSchema,
    ...xyDataLayerSharedSchema,
    breakdown_by: schema.maybe(esqlColumnSchema),
    y: schema.arrayOf(
      esqlColumnSchema.extends(
        {
          axis: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
          color: schema.maybe(staticColorSchema),
        },
        { meta: { description: 'ES|QL column for Y-axis metric' } }
      ),
      { meta: { description: 'Array of ES|QL columns for Y-axis metrics' } }
    ),
    x: schema.maybe(esqlColumnSchema),
  },
  { meta: { description: 'Data layer for ES|QL queries with column references' } }
);

/**
 * Text label configuration for reference lines
 */
const referenceLineTextLabelOption = schema.object(
  {
    type: schema.literal('label'),
    text: schema.string({ meta: { description: 'Label text to display' } }),
  },
  { meta: { description: 'Text label for reference line' } }
);

/**
 * Common visual configuration for reference lines
 */
const referenceLineLayerShared = {
  fill: schema.maybe(
    schema.oneOf([schema.literal('above'), schema.literal('below')], {
      meta: { description: 'Fill direction for reference line' },
    })
  ),
  text: schema.maybe(referenceLineTextLabelOption),
  icon: schema.maybe(
    schema.string({ meta: { description: 'Icon to display on the reference line' } })
  ),
  stroke_width: schema.maybe(schema.number({ meta: { description: 'Line width in pixels' } })),
  stroke_dash: schema.maybe(
    schema.oneOf([schema.literal('straight'), schema.literal('dashed'), schema.literal('dotted')], {
      meta: { description: 'Line style' },
    })
  ),
  color: schema.maybe(staticColorSchema),
  axis: schema.oneOf([schema.literal('bottom'), schema.literal('left'), schema.literal('right')], {
    defaultValue: 'left',
    meta: { description: 'Which axis the reference line applies to' },
  }),
};

/**
 * Reference line layer for standard queries with threshold values
 */
const referenceLineLayerSchemaNoESQL = schema.object(
  {
    ...layerSettingsSchemaRaw,
    ...datasetSchema,
    type: schema.literal('referenceLines'),
    thresholds: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithStaticOps(
        schema.object(referenceLineLayerShared, {
          meta: { description: 'Reference line threshold configuration' },
        })
      ),
      { meta: { description: 'Array of reference line thresholds' } }
    ),
  },
  { meta: { description: 'Reference line layer for standard queries' } }
);

/**
 * Reference line layer for ES|QL queries with column-based thresholds
 */
const referenceLineLayerSchemaESQL = schema.object(
  {
    ...layerSettingsSchemaRaw,
    ...datasetEsqlTableSchema,
    type: schema.literal('referenceLines'),
    thresholds: schema.arrayOf(
      schema.allOf([
        esqlColumnSchema,
        schema.object(referenceLineLayerShared, {
          meta: { description: 'ES|QL reference line threshold' },
        }),
      ]),
      { meta: { description: 'Array of ES|QL-based reference line thresholds' } }
    ),
  },
  { meta: { description: 'Reference line layer for ES|QL queries' } }
);

/**
 * Common properties for all annotation types
 */
const annotationEventShared = {
  name: schema.maybe(schema.string({ meta: { description: 'Display name for the annotation' } })),
  color: schema.maybe(staticColorSchema),
  hidden: schema.maybe(schema.boolean({ meta: { description: 'Whether to hide the annotation' } })),
};

/**
 * Visual properties specific to point annotations
 */
const annotationPointShared = {
  ...annotationEventShared,
  icon: schema.maybe(
    schema.string({ meta: { description: 'Icon to display at the annotation point' } })
  ),
  line: schema.maybe(
    schema.object(
      {
        stroke_width: schema.number({ meta: { description: 'Vertical line width in pixels' } }),
        stroke_dash: schema.oneOf(
          [schema.literal('straight'), schema.literal('dashed'), schema.literal('dotted')],
          { meta: { description: 'Vertical line style' } }
        ),
      },
      { meta: { description: 'Vertical line configuration for point annotation' } }
    )
  ),
};

/**
 * Text label configuration for annotations
 */
const annotationTextLabelOption = schema.object(
  {
    type: schema.literal('label'),
    text: schema.string({ meta: { description: 'Label text to display' } }),
  },
  { meta: { description: 'Text label for annotation' } }
);

/**
 * Timestamp format for annotations (Unix timestamp or ISO date string)
 */
const annotationTimestampSchema = schema.oneOf([
  schema.number({ meta: { description: 'Unix timestamp in milliseconds' } }),
  schema.string({ meta: { description: 'ISO date string' } }),
]);

/**
 * Query-based annotation that finds events matching a filter
 */
const annotationQuery = schema.object(
  {
    ...annotationPointShared,
    type: schema.literal('query'),
    query: filterSchema,
    time_field: schema.string({ meta: { description: 'Field containing the timestamp' } }),
    text: schema.maybe(annotationTextLabelOption),
    extra_fields: schema.maybe(
      schema.arrayOf(
        schema.string({ meta: { description: 'Additional field to include in tooltip' } }),
        { meta: { description: 'Additional fields for annotation tooltip' } }
      )
    ),
  },
  { meta: { description: 'Annotation from query results matching a filter' } }
);

/**
 * Manually specified point annotation at a specific timestamp
 */
const annotationManualEvent = schema.object(
  {
    ...annotationPointShared,
    type: schema.literal('point'),
    timestamp: annotationTimestampSchema,
    text: schema.maybe(
      schema.oneOf([
        annotationTextLabelOption,
        schema.object(
          {
            type: schema.literal('field'),
            field: schema.string({ meta: { description: 'Field name containing label text' } }),
          },
          { meta: { description: 'Text from document field' } }
        ),
      ])
    ),
  },
  { meta: { description: 'Manual point annotation at specific timestamp' } }
);

/**
 * Manually specified range annotation spanning a time interval
 */
const annotationManualRange = schema.object(
  {
    ...annotationEventShared,
    type: schema.literal('range'),
    interval: schema.object(
      {
        from: annotationTimestampSchema,
        to: annotationTimestampSchema,
      },
      { meta: { description: 'Time range for annotation' } }
    ),
    fill: schema.maybe(
      schema.oneOf([schema.literal('inside'), schema.literal('outside')], {
        defaultValue: 'inside',
        meta: { description: 'Fill direction for range' },
      })
    ),
  },
  { meta: { description: 'Manual range annotation spanning time interval' } }
);

/**
 * Annotation layer containing query-based, point, and range annotations
 */
const annotationLayerSchema = schema.object(
  {
    ...ignoringGlobalFiltersSchemaRaw,
    ...datasetSchema,
    type: schema.literal('annotations'),
    events: schema.arrayOf(
      schema.oneOf([annotationQuery, annotationManualEvent, annotationManualRange]),
      { meta: { description: 'Array of annotation configurations' } }
    ),
  },
  { meta: { description: 'Layer containing annotations (query-based, points, and ranges)' } }
);

/**
 * Any valid XY chart layer type (data, reference line, or annotation)
 */
const xyLayerSchema = schema.oneOf([
  xyDataLayerSchemaNoESQL,
  xyDataLayerSchemaESQL,
  referenceLineLayerSchemaNoESQL,
  referenceLineLayerSchemaESQL,
  annotationLayerSchema,
]);

/**
 * Complete XY chart state configuration with layers and visualization settings
 */
export const xyStateSchema = schema.object(
  {
    type: schema.literal('xy'),
    ...sharedPanelInfoSchema,
    ...xySharedSettings,
    ...dslOnlyPanelInfoSchema,
    layers: schema.arrayOf(xyLayerSchema, {
      minSize: 1,
      meta: { description: 'Chart layers (minimum 1 required)' },
    }),
  },
  { meta: { description: 'Complete XY chart configuration' } }
);

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
