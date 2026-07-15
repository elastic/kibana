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
  esqlColumnWithFormatSchema,
  esqlColumnSchema,
  fieldMetricOrStaticOrFormulaOperationDefinitionSchema,
} from '../metric_ops';
import { colorByValueSchema, noColorSchema, autoColorSchema, AUTO_COLOR } from '../color';
import { dataSourceSchema, dataSourceEsqlTableSchema } from '../data_source';
import { dslOnlyPanelInfoSchema, layerSettingsSchema, sharedPanelInfoSchema } from '../shared';
import { mergeAllMetricsWithChartDimensionSchema } from './shared';
import { builderEnums } from '../enums';
import { objectUnion } from './utils/object_union';

const gaugeStylingSchema = schema.object(
  {
    shape: schema.maybe(
      schema.oneOf(
        [
          schema.object(
            {
              type: schema.literal('bullet'),
              orientation: builderEnums.simpleOrientation({
                defaultValue: 'horizontal',
              }),
            },
            {
              meta: {
                id: 'gaugeShapeBullet',
                title: 'Shape (Bullet)',
                description: 'Bullet gauge shape.',
              },
            }
          ),
          schema.object(
            {
              type: schema.oneOf([
                schema.literal('circle'),
                schema.literal('semi_circle'),
                schema.literal('arc'),
              ]),
            },
            {
              meta: {
                id: 'gaugeShapeCircular',
                title: 'Shape (Circular)',
                description: 'Circular gauge shape.',
              },
            }
          ),
        ],
        { defaultValue: { type: 'bullet', orientation: 'horizontal' } }
      )
    ),
  },
  {
    meta: {
      id: 'gaugeStyling',
      title: 'Gauge styling',
      description: 'Visual chart styling options',
    },
  }
);

const gaugeConfigMetricInnerNoESQLOpsSchema = {
  /**
   * Minimum value for the gauge
   * Note: label, format and other visual options are ignored
   */
  min: schema.maybe(fieldMetricOrStaticOrFormulaOperationDefinitionSchema),
  /**
   * Maximum value for the gauge
   * Note: label, format and other visual options are ignored
   */
  max: schema.maybe(fieldMetricOrStaticOrFormulaOperationDefinitionSchema),
  /**
   * Goal value for the gauge
   * Note: label, format and other visual options are ignored
   */
  goal: schema.maybe(fieldMetricOrStaticOrFormulaOperationDefinitionSchema),
};

const gaugeConfigMetricInnerESQLOpsSchema = {
  /**
   * Minimum value for the gauge
   */
  min: schema.maybe(esqlColumnSchema),
  /**
   * Maximum value for the gauge
   */
  max: schema.maybe(esqlColumnSchema),
  /**
   * Goal value for the gauge
   */
  goal: schema.maybe(esqlColumnSchema),
};

const gaugeConfigMetricOptionsSchema = {
  /**
   * Title configuration
   */
  title: schema.maybe(
    schema.object(
      {
        visible: schema.maybe(
          schema.boolean({
            meta: { description: 'When `true`, displays the title.' },
            defaultValue: true,
          })
        ),
        text: schema.maybe(schema.string({ meta: { description: 'Title text.' } })),
      },
      { meta: { description: 'Title configuration' } }
    )
  ),
  /**
   * Subtitle
   */
  subtitle: schema.maybe(
    schema.string({ meta: { description: 'Subtitle below the gauge value.' } })
  ),
  /**
   * Color configuration
   */
  color: schema.maybe(
    schema.oneOf([colorByValueSchema, noColorSchema, autoColorSchema], {
      meta: { description: 'Color configuration for the gauge fill.' },
      defaultValue: AUTO_COLOR,
    })
  ),
  /**
   * Tick marks configuration
   */
  ticks: schema.maybe(
    schema.object(
      {
        visible: schema.maybe(
          schema.boolean({
            meta: { description: 'When `true`, displays tick marks on the gauge.' },
            defaultValue: true,
          })
        ),
        mode: schema.maybe(
          schema.oneOf([schema.literal('auto'), schema.literal('bands')], {
            meta: { description: 'Tick placement mode.' },
            defaultValue: 'bands',
          })
        ),
      },
      { meta: { description: 'Ticks configuration' } }
    )
  ),
};

export const gaugeConfigSchemaNoESQL = schema.object(
  {
    type: schema.literal('gauge'),
    ...sharedPanelInfoSchema,
    ...dslOnlyPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceSchema,
    styling: schema.maybe(gaugeStylingSchema),
    /**
     * Primary value configuration, must define operation.
     */
    metric: mergeAllMetricsWithChartDimensionSchema(
      {
        ...gaugeConfigMetricOptionsSchema,
        ...gaugeConfigMetricInnerNoESQLOpsSchema,
      },
      'gaugeMetric'
    ),
  },
  {
    meta: {
      id: 'gaugeNoESQL',
      title: 'Gauge Chart (DSL)',
      description: 'Gauge configuration using a data view.',
    },
  }
);

export const gaugeConfigSchemaESQL = schema.object(
  {
    type: schema.literal('gauge'),
    ...sharedPanelInfoSchema,
    ...layerSettingsSchema,
    ...dataSourceEsqlTableSchema,
    styling: schema.maybe(gaugeStylingSchema),
    /**
     * Primary value configuration, must define operation.
     */
    metric: esqlColumnWithFormatSchema.extends({
      ...gaugeConfigMetricOptionsSchema,
      ...gaugeConfigMetricInnerESQLOpsSchema,
    }),
  },
  {
    meta: {
      id: 'gaugeESQL',
      title: 'Gauge Chart (ES|QL)',
      description: 'Gauge configuration using an ES|QL query.',
    },
  }
);

export const gaugeConfigSchema = objectUnion([gaugeConfigSchemaNoESQL, gaugeConfigSchemaESQL], {
  meta: {
    id: 'gaugeChart',
    title: 'Gauge Chart',
    description:
      'A gauge chart with a metric value and optional minimum, maximum, and goal markers, in bullet or circular shape.',
  },
});

export type GaugeConfig = TypeOf<typeof gaugeConfigSchema>;
export type GaugeConfigNoESQL = TypeOf<typeof gaugeConfigSchemaNoESQL>;
export type GaugeConfigESQL = TypeOf<typeof gaugeConfigSchemaESQL>;
