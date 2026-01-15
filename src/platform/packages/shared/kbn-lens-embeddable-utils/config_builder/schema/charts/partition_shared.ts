/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ColorMappingType, StaticColorType } from '../color';

export const legendTruncateAfterLinesSchema = schema.maybe(
  schema.number({
    defaultValue: 1,
    min: 1,
    max: 10,
    meta: { description: 'Maximum lines before truncating legend items (1-10)' },
  })
);

export const legendVisibleSchema = schema.maybe(
  schema.oneOf([schema.literal('auto'), schema.literal('show'), schema.literal('hide')], {
    meta: { description: 'Legend visibility: auto, show, or hide' },
  })
);

export const legendSizeSchema = schema.maybe(
  schema.oneOf(
    [
      schema.literal('auto'),
      schema.literal('small'),
      schema.literal('medium'),
      schema.literal('large'),
      schema.literal('xlarge'),
    ],
    { meta: { description: 'Legend size: auto, small, medium, large, or xlarge' } }
  )
);

export const valueDisplaySchema = schema.maybe(
  schema.object(
    {
      mode: schema.oneOf(
        [schema.literal('hidden'), schema.literal('absolute'), schema.literal('percentage')],
        { meta: { description: 'Value display mode: hidden, absolute, or percentage' } }
      ),
      percent_decimals: schema.maybe(
        schema.number({
          defaultValue: 2,
          min: 0,
          max: 10,
          meta: { description: 'Decimal places for percentage display (0-10)' },
        })
      ),
    },
    { meta: { description: 'Configuration for displaying values in chart cells' } }
  )
);

export const legendNestedSchema = schema.maybe(
  schema.boolean({
    defaultValue: false,
    meta: { description: 'Show nested legend with hierarchical breakdown levels' },
  })
);

export type PartitionMetric =
  | {}
  | {
      color?: StaticColorType;
    };
export interface PartitionGroupBy {
  collapse_by?: string;
  color?: ColorMappingType;
}

function validateColouringAssignments({
  metrics,
  group_by,
}: {
  metrics: Array<PartitionMetric>;
  group_by?: Array<PartitionGroupBy>;
}) {
  if (group_by) {
    const hasStaticColouring = metrics.some((metric) => 'color' in metric && metric.color != null);
    if (group_by.length && hasStaticColouring) {
      return 'Colouring cannot be assigned to metric dimensions when grouping dimensions are defined.';
    }
    const breakdownsWithColouring = group_by.filter((def) => def.color != null);
    if (breakdownsWithColouring.length > 1) {
      return 'Colouring can only be assigned to a single grouping dimension.';
    }
    if (breakdownsWithColouring[0]?.collapse_by) {
      return 'Colouring cannot be assigned to a non-collapsed grouping dimension.';
    }
    const nonCollapsedGroupBy = group_by.filter((def) => def.collapse_by == null);
    if (nonCollapsedGroupBy[0] !== breakdownsWithColouring[0]) {
      return 'Colouring can only be assigned to the first non-collapsed grouping dimension.';
    }
  }
}

export function validateGroupings({
  metrics,
  group_by,
}: {
  metrics: Array<PartitionMetric>;
  group_by?: Array<{ collapse_by?: string }>;
}) {
  if (metrics.length > 1) {
    if ((group_by?.filter((def) => def.collapse_by == null).length ?? 0) > 0) {
      return 'When multiple metrics are defined, only collapsed group_by dimensions are allowed.';
    }
  }
  if ((group_by?.filter((def) => def.collapse_by == null).length ?? 0) > 1) {
    return 'Only a single non-collapsed dimension is allowed for group_by';
  }
}

export function validateMultipleMetricsCriteria(arg: {
  metrics: Array<PartitionMetric>;
  group_by?: Array<{ collapse_by?: string }>;
}) {
  validateGroupings(arg);
  validateColouringAssignments(arg);
}
