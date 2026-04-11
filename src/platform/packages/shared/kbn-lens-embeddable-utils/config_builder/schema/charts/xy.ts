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
  axisTitleSchemaProps,
  collapseBySchema,
  dslOnlyPanelInfoSchema,
  ignoringGlobalFiltersSchemaRaw,
  layerSettingsSchema,
  legendTruncateAfterLinesSchema,
  sharedPanelInfoSchema,
} from '../shared';
import { datasetEsqlTableSchema, datasetSchema } from '../dataset';
import {
  mergeAllBucketsWithChartDimensionSchema,
  mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps,
  mergeAllMetricsWithChartDimensionSchemaWithStaticOps,
  xScaleSchema,
} from './shared';
import { esqlColumnWithFormatSchema } from '../metric_ops';
import { colorMappingSchema, staticColorSchema } from '../color';
import { filterSchema } from '../filter';
import { builderEnums } from '../enums';
import { cornerPositionSchema } from '../alignments';

/**
 * Statistical functions that can be displayed in chart legend for data series
 */
export const statisticsSchema = schema.oneOf(
  [
    schema.literal('min'),
    schema.literal('max'),
    schema.literal('avg'),
    schema.literal('median'),
    schema.literal('range'),
    schema.literal('last_value'),
    schema.literal('last_non_null_value'),
    schema.literal('first_value'),
    schema.literal('first_non_null_value'),
    schema.literal('difference'),
    schema.literal('difference_percentage'),
    schema.literal('count'),
    schema.literal('total'),
    schema.literal('standard_deviation'),
    schema.literal('variance'),
    schema.literal('distinct_count'),
    schema.literal('current_and_last_value'),
  ],
  {
    meta: {
      description: 'Statistical functions that can be displayed in chart legend for data series',
    },
  }
);

// Should be kept in sync with the number of statistics options
export const statisticsOptionsSize = 17;

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
    schema.object(axisTitleSchemaProps, { meta: { description: 'Axis title configuration' } })
  ),
  ticks: schema.maybe(
    schema.object(
      {
        visible: schema.boolean({ meta: { description: 'Show tick marks on the axis' } }),
      },
      { meta: { description: 'Axis tick marks configuration' } }
    )
  ),
  grid: schema.maybe(
    schema.object(
      {
        visible: schema.boolean({ meta: { description: 'Show grid lines for this axis' } }),
      },
      { meta: { description: 'Axis grid lines configuration' } }
    )
  ),
  labels: schema.maybe(
    schema.object(
      {
        /**
         * Orientation of the axis labels. Possible values:
         * - 'horizontal': Labels aligned horizontally
         * - 'vertical': Labels aligned vertically
         * - 'angled': Labels at an angle
         */
        orientation: builderEnums.orientation({
          meta: {
            description: 'Orientation of the axis labels',
          },
        }),
      },
      { meta: { description: 'Label configuration' } }
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
  visibility: schema.oneOf(
    [schema.literal('auto'), schema.literal('visible'), schema.literal('hidden')],
    { meta: { description: 'Show the legend' } }
  ),
  statistics: schema.maybe(
    schema.arrayOf(statisticsSchema, {
      meta: { description: 'Statistics to display in legend' },
      maxSize: statisticsOptionsSize,
    })
  ),
};

/**
 * Layout Schemas
 */
const legendTruncateMaxPixelsSchema = schema.number({
  defaultValue: 250,
  min: 10,
  max: 1000,
  meta: {
    description: 'Maximum pixels before truncating legend items in list layout',
    id: 'legendTruncateMaxPixels',
  },
});
const gridLayout = schema.object({
  type: schema.literal('grid'),
  truncate: schema.maybe(schema.object({ max_lines: legendTruncateAfterLinesSchema })),
});
const listLayout = schema.object({
  type: schema.literal('list'),
  truncate: schema.maybe(schema.object({ max_pixels: legendTruncateMaxPixelsSchema })),
});

const XY_API_LINE_INTERPOLATION = {
  LINEAR: 'linear',
  SMOOTH: 'smooth',
  STEPPED: 'stepped',
} as const;

export type XYApiLineInterpolation = typeof XY_API_LINE_INTERPOLATION;

const decorationsSchema = schema.object(
  {
    end_zones: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({ meta: { description: 'Show end zones' } }),
        },
        { meta: { description: 'End zones (partial buckets) configuration' } }
      )
    ),
    current_time_marker: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({ meta: { description: 'Show current time marker line' } }),
        },
        { meta: { description: 'Current time marker configuration' } }
      )
    ),
    point_visibility: schema.maybe(
      schema.oneOf([schema.literal('auto'), schema.literal('visible'), schema.literal('hidden')], {
        meta: { description: 'Show data points on lines' },
      })
    ),
    line_interpolation: schema.maybe(
      schema.oneOf([
        schema.literal(XY_API_LINE_INTERPOLATION.LINEAR),
        schema.literal(XY_API_LINE_INTERPOLATION.SMOOTH),
        schema.literal(XY_API_LINE_INTERPOLATION.STEPPED),
      ])
    ),
    minimum_bar_height: schema.maybe(
      schema.number({ min: 0, meta: { description: 'Minimum bar height in pixels' } })
    ),
    values: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({ meta: { description: 'Display value labels on data points' } }),
        },
        { meta: { description: 'Value label configuration' } }
      )
    ),
    fill_opacity: schema.maybe(
      schema.number({
        min: 0,
        max: 2,
        meta: { description: 'Area chart fill opacity (0-1 typical, max 2 for legacy)' },
      })
    ),
  },
  {
    meta: {
      id: 'xyDecorations',
      description: 'Visual enhancements and styling options for the chart',
    },
  }
);

/**
 * Shared settings that apply to the entire XY chart visualization
 */
const xySharedSettings = {
  legend: schema.maybe(
    schema.oneOf(
      [
        // Outside legend, position: top/bottom (supports both Grid and List layout)
        schema.object(
          {
            ...sharedLegendSchema,
            placement: schema.maybe(schema.literal('outside')),
            layout: schema.maybe(schema.oneOf([gridLayout, listLayout])),
            position: schema.maybe(schema.oneOf([schema.literal('top'), schema.literal('bottom')])),
          },
          {
            meta: {
              id: 'xyLegendOutsideHorizontal',
              title: 'Outside horizontal',
              description: 'Outside legend positioned horizontal (top/bottom) of the chart',
            },
          }
        ),
        // Outside legend, position: left/right (supports only Grid layout)
        schema.object(
          {
            ...sharedLegendSchema,
            placement: schema.maybe(schema.literal('outside')),
            layout: schema.maybe(gridLayout),
            position: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
            size: schema.maybe(
              schema.oneOf([
                schema.literal('small'),
                schema.literal('medium'),
                schema.literal('large'),
                schema.literal('xlarge'),
              ])
            ),
          },
          {
            meta: {
              id: 'xyLegendOutsideVertical',
              title: 'Outside vertical',
              description: 'Outside legend positioned vertical (left/right) of the chart',
            },
          }
        ),
        // Inside legend
        schema.object(
          {
            ...sharedLegendSchema,
            placement: schema.literal('inside'),
            layout: schema.maybe(gridLayout),
            columns: schema.maybe(
              schema.number({ min: 1, max: 5, meta: { description: 'Number of legend columns' } })
            ),
            position: schema.maybe(
              cornerPositionSchema({
                meta: { description: 'Legend position inside the chart' },
              })
            ),
          },
          {
            meta: {
              id: 'xyLegendInside',
              title: 'Inside',
              description: 'Inside legend',
            },
          }
        ),
      ],
      {
        meta: {
          id: 'xyLegend',
          title: 'Legend',
          description: 'Legend configuration for XY chart',
        },
      }
    )
  ),

  fitting: schema.maybe(
    schema.object(
      {
        type: schema.oneOf(
          [
            schema.literal('none'),
            schema.literal('zero'),
            schema.literal('linear'),
            schema.literal('carry'),
            schema.literal('lookahead'),
            schema.literal('average'),
            schema.literal('nearest'),
          ],
          { meta: { description: 'Fitting function type for missing data' } }
        ),
        dotted: schema.maybe(
          schema.boolean({ meta: { description: 'Show fitted values as dotted lines' } })
        ),
        end_value: schema.maybe(
          schema.oneOf([schema.literal('none'), schema.literal('zero'), schema.literal('nearest')])
        ),
      },
      {
        meta: {
          id: 'xyFitting',
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
              scale: xScaleSchema,
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
      {
        meta: {
          id: 'xyAxis',
          title: 'Axis',
          description: 'Axis configuration for X, left Y, and right Y axes',
        },
      }
    )
  ),
  decorations: schema.maybe(decorationsSchema),
};

/**
 * Data layer configuration for standard (non-ES|QL) queries with breakdown and metrics
 */
const xyDataLayerSchemaNoESQL = schema.object(
  {
    ...layerSettingsSchema,
    ...datasetSchema,
    ...xyDataLayerSharedSchema,
    breakdown_by: schema.maybe(
      mergeAllBucketsWithChartDimensionSchema({
        collapse_by: schema.maybe(collapseBySchema),
        color: schema.maybe(colorMappingSchema),
        aggregate_first: schema.maybe(
          schema.boolean({
            meta: { description: 'Whether to aggregate before splitting series' },
          })
        ),
      })
    ),
    y: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps({
        axis: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
        color: schema.maybe(staticColorSchema),
      }),
      { meta: { description: 'Array of metrics to display on Y-axis' }, maxSize: 100 }
    ),
    x: schema.maybe(mergeAllBucketsWithChartDimensionSchema({})),
  },
  {
    meta: {
      id: 'xyLayerNoESQL',
      title: 'Layer (DSL)',
      description: 'Data layer for standard queries with metrics and buckets',
    },
  }
);

/**
 * Data layer configuration for ES|QL queries with column-based metrics
 */
const xyDataLayerSchemaESQL = schema.object(
  {
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    ...xyDataLayerSharedSchema,
    breakdown_by: schema.maybe(
      esqlColumnWithFormatSchema.extends(
        {
          color: schema.maybe(colorMappingSchema),
          collapse_by: schema.maybe(collapseBySchema),
        },
        { meta: { description: 'ES|QL column for breakdown' } }
      )
    ),
    y: schema.arrayOf(
      esqlColumnWithFormatSchema.extends(
        {
          axis: schema.maybe(schema.oneOf([schema.literal('left'), schema.literal('right')])),
          color: schema.maybe(staticColorSchema),
        },
        { meta: { description: 'ES|QL column for Y-axis metric' } }
      ),
      { meta: { description: 'Array of ES|QL columns for Y-axis metrics' }, maxSize: 100 }
    ),
    x: schema.maybe(esqlColumnWithFormatSchema),
  },
  {
    meta: {
      id: 'xyLayerESQL',
      title: 'Layer (ES|QL)',
      description: 'Data layer for ES|QL queries with column references',
    },
  }
);

const getListOfAvailableIcons = (description: string) =>
  schema.oneOf(
    [
      schema.literal('asterisk'),
      schema.literal('alert'),
      schema.literal('bell'),
      schema.literal('bolt'),
      schema.literal('bug'),
      schema.literal('circle'),
      schema.literal('editorComment'),
      schema.literal('flag'),
      schema.literal('heart'),
      schema.literal('mapMarker'),
      schema.literal('pinFilled'),
      schema.literal('starEmpty'),
      schema.literal('starFilled'),
      schema.literal('tag'),
      schema.literal('triangle'),
    ],
    { meta: { description } }
  );

const STROKE_WIDTH_MIN = 1;
const STROKE_WIDTH_MAX = 10;

/**
 * Common visual configuration for reference lines
 */
const referenceLineLayerShared = {
  fill: schema.maybe(
    schema.oneOf([schema.literal('above'), schema.literal('below')], {
      meta: { description: 'Fill direction for reference line' },
    })
  ),
  text: schema.maybe(
    schema.object(
      {
        visible: schema.boolean({ meta: { description: 'Show text label on the reference line' } }),
      },
      { meta: { description: 'Reference line text label configuration' } }
    )
  ),
  icon: schema.maybe(getListOfAvailableIcons('Icon to display on the reference line')),
  stroke_width: schema.maybe(
    schema.number({
      meta: { description: 'Line width in pixels' },
      min: STROKE_WIDTH_MIN,
      max: STROKE_WIDTH_MAX,
    })
  ),
  stroke_dash: schema.maybe(
    schema.oneOf([schema.literal('solid'), schema.literal('dashed'), schema.literal('dotted')], {
      meta: { description: 'Line style' },
    })
  ),
  color: schema.maybe(staticColorSchema),
  position: schema.maybe(
    schema.oneOf([schema.literal('auto'), schema.literal('left'), schema.literal('right')], {
      meta: { description: 'Position of the icon and label relative to the reference line' },
    })
  ),
  axis: schema.maybe(
    schema.oneOf([schema.literal('bottom'), schema.literal('left'), schema.literal('right')], {
      defaultValue: 'left',
      meta: { description: 'Which axis the reference line applies to' },
    })
  ),
};

/**
 * Reference line layer for standard queries with threshold values
 */
const referenceLineLayerSchemaNoESQL = schema.object(
  {
    ...layerSettingsSchema,
    ...datasetSchema,
    type: schema.literal('referenceLines'),
    thresholds: schema.arrayOf(
      mergeAllMetricsWithChartDimensionSchemaWithStaticOps(referenceLineLayerShared),
      { meta: { description: 'Array of reference line thresholds' }, minSize: 1, maxSize: 100 }
    ),
  },
  {
    meta: {
      id: 'xyReferenceLineLayerNoESQL',
      title: 'Reference Line Layer (DSL)',
      description: 'Reference line layer for standard queries',
    },
  }
);

/**
 * Reference line layer for ES|QL queries with column-based thresholds
 */
const referenceLineLayerSchemaESQL = schema.object(
  {
    ...layerSettingsSchema,
    ...datasetEsqlTableSchema,
    type: schema.literal('referenceLines'),
    thresholds: schema.arrayOf(esqlColumnWithFormatSchema.extends(referenceLineLayerShared), {
      meta: { description: 'Array of ES|QL-based reference line thresholds' },
      minSize: 1,
      maxSize: 100,
    }),
  },
  {
    meta: {
      id: 'xyReferenceLineLayerESQL',
      title: 'Reference Line Layer (ES|QL)',
      description: 'Reference line layer for ES|QL queries',
    },
  }
);

/**
 * Common properties for all annotation types
 */
const annotationEventShared = {
  color: schema.maybe(staticColorSchema),
  visible: schema.maybe(schema.boolean({ meta: { description: 'Show the annotation' } })),
};

/**
 * Visual properties specific to point annotations
 */
const annotationPointShared = {
  ...annotationEventShared,
  icon: schema.maybe(getListOfAvailableIcons('Icon to display at the annotation point')),
  line: schema.maybe(
    schema.object(
      {
        stroke_width: schema.number({
          meta: { description: 'Vertical line width in pixels' },
          min: STROKE_WIDTH_MIN,
          max: STROKE_WIDTH_MAX,
        }),
        stroke_dash: schema.oneOf(
          [schema.literal('solid'), schema.literal('dashed'), schema.literal('dotted')],
          { meta: { description: 'Vertical line style' } }
        ),
      },
      { meta: { description: 'Vertical line configuration for point annotation' } }
    )
  ),
};

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
    label: schema.maybe(schema.string({ meta: { description: 'Label text for the annotation' } })),
    text: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({ meta: { description: 'Show text label on the annotation' } }),
          field: schema.maybe(
            schema.string({
              meta: { description: 'Field name for text label source' },
            })
          ),
        },
        { meta: { description: 'Annotation text label configuration' } }
      )
    ),
    extra_fields: schema.maybe(
      schema.arrayOf(
        schema.string({ meta: { description: 'Additional field to include in tooltip' } }),
        { meta: { description: 'Additional fields for annotation tooltip' }, maxSize: 100 }
      )
    ),
  },
  {
    meta: {
      id: 'xyAnnotationQuery',
      description: 'Annotation from query results matching a filter',
    },
  }
);

/**
 * Manually specified point annotation at a specific timestamp
 */
const annotationManualEvent = schema.object(
  {
    ...annotationPointShared,
    type: schema.literal('point'),
    timestamp: annotationTimestampSchema,
    label: schema.maybe(schema.string({ meta: { description: 'Label text for the annotation' } })),
    text: schema.maybe(
      schema.object(
        {
          visible: schema.boolean({ meta: { description: 'Show text label on the annotation' } }),
        },
        { meta: { description: 'Annotation text label visibility' } }
      )
    ),
  },
  {
    meta: {
      id: 'xyAnnotationManualEvent',
      description: 'Manual point annotation at specific timestamp',
    },
  }
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
    label: schema.maybe(schema.string({ meta: { description: 'Label text for the annotation' } })),
    fill: schema.maybe(
      schema.oneOf([schema.literal('inside'), schema.literal('outside')], {
        defaultValue: 'inside',
        meta: { description: 'Fill direction for range' },
      })
    ),
  },
  {
    meta: {
      id: 'xyAnnotationManualRange',
      description: 'Manual range annotation spanning time interval',
    },
  }
);

/**
 * Annotation layer containing query-based, point, and range annotations (by-value)
 */
const annotationLayerByValueSchema = schema.object(
  {
    ...ignoringGlobalFiltersSchemaRaw,
    ...datasetSchema,
    type: schema.literal('annotations'),
    events: schema.arrayOf(
      schema.oneOf([annotationQuery, annotationManualEvent, annotationManualRange]),
      { meta: { description: 'Array of annotation configurations' }, minSize: 1, maxSize: 100 }
    ),
  },
  {
    meta: {
      id: 'xyAnnotationLayerNoESQL',
      title: 'Annotation Layer (DSL)',
      description: 'Layer containing annotations (query-based, points, and ranges)',
    },
  }
);

/**
 * By-reference annotation layer that links to a library annotation group
 */
const annotationByRefLayerSchema = schema.object(
  {
    type: schema.literal('annotation_group'),
    group_id: schema.string({
      meta: { description: 'ID of the linked annotation group from the library' },
    }),
  },
  {
    meta: {
      id: 'xyAnnotationByRefLayer',
      description: 'Reference to a library annotation group',
    },
  }
);

const annotationLayerSchema = schema.oneOf(
  [annotationLayerByValueSchema, annotationByRefLayerSchema],
  {
    meta: {
      id: 'xyAnnotationLayer',
      description: 'Annotation layer which can be defined by-value or by-reference',
    },
  }
);

/**
 * Complete XY chart state configuration with layers and visualization settings
 */
export const xyStateSchema = schema.object(
  {
    type: schema.literal('xy'),
    ...sharedPanelInfoSchema,
    ...xySharedSettings,
    ...dslOnlyPanelInfoSchema,
    layers: schema.arrayOf(
      /**
       * Any valid XY chart layer type (data, reference line, or annotation)
       */
      schema.oneOf([
        xyDataLayerSchemaNoESQL,
        xyDataLayerSchemaESQL,
        referenceLineLayerSchemaNoESQL,
        referenceLineLayerSchemaESQL,
        annotationLayerSchema,
      ]),
      {
        minSize: 1,
        maxSize: 100,
        meta: { description: 'Chart layers (minimum 1 required)' },
      }
    ),
  },
  { meta: { id: 'xyChart', title: 'XY Chart', description: 'Complete XY chart configuration' } }
);

// TODO: temporary ESQL schema for XY chart to not feed agent with heavy schema for DSL that is not used in agent
export const xyStateSchemaESQL = schema.object(
  {
    type: schema.literal('xy'),
    ...sharedPanelInfoSchema,
    ...xySharedSettings,
    layers: schema.arrayOf(xyDataLayerSchemaESQL, {
      minSize: 1,
      maxSize: 1,
      meta: { description: 'Only single layer ESQL charts are supported ' },
    }),
  },
  {
    meta: {
      id: 'xyChartESQL',
      title: 'XY Chart (ES|QL)',
    },
  }
);

export type XYState = TypeOf<typeof xyStateSchema>;
export type XYStateESQL = TypeOf<typeof xyStateSchemaESQL>;
export type DataLayerTypeESQL = TypeOf<typeof xyDataLayerSchemaESQL>;
export type DataLayerTypeNoESQL = TypeOf<typeof xyDataLayerSchemaNoESQL>;
export type DataLayerType = DataLayerTypeNoESQL | DataLayerTypeESQL;
export type ReferenceLineLayerTypeESQL = TypeOf<typeof referenceLineLayerSchemaESQL>;
export type ReferenceLineLayerTypeNoESQL = TypeOf<typeof referenceLineLayerSchemaNoESQL>;
export type ReferenceLineLayerType = ReferenceLineLayerTypeNoESQL | ReferenceLineLayerTypeESQL;
export type AnnotationLayerType = TypeOf<typeof annotationLayerSchema>;
export type AnnotationLayerByRefType = TypeOf<typeof annotationByRefLayerSchema>;
export type AnnotationLayerByValueType = TypeOf<typeof annotationLayerByValueSchema>;
export type LayerTypeESQL = DataLayerTypeESQL | ReferenceLineLayerTypeESQL;
export type LayerTypeNoESQL =
  | DataLayerTypeNoESQL
  | ReferenceLineLayerTypeNoESQL
  | AnnotationLayerType;

export type XYDecorations = TypeOf<typeof decorationsSchema>;
