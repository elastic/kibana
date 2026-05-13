/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { AutoColorType, ColorMappingType, StaticColorType } from '../color';
import { groupIsNotCollapsed } from '../../utils';

export const valueDisplaySchema = z
  .object({
    visible: z.boolean().optional().meta({ description: 'Show metric values on the chart' }),
    mode: z
      .union([z.literal('absolute'), z.literal('percentage')])
      .optional()
      .meta({
        description: 'How to format values when visible.',
      }),
    percent_decimals: z
      .number()
      .min(0)
      .max(10)
      .default(2)
      .optional()
      .meta({ description: 'Decimal places for percentage display (0-10)' }),
  })
  .meta({
    id: 'valueDisplay',
    description:
      'Configure the visibility and the format of the values rendered on each chart partition section',
  })
  .optional();

export const legendNestedSchema = z
  .boolean()
  .default(false)
  .optional()
  .meta({ description: 'Show nested legend with hierarchical breakdown levels' });

export type PartitionMetric =
  | {}
  | {
      color?: StaticColorType | AutoColorType;
    };
export interface PartitionGroupBy {
  collapse_by?: string;
  color?: ColorMappingType;
}

export function validateColoringAssignments({
  metrics,
  group_by,
}: {
  metrics: Array<PartitionMetric>;
  group_by?: Array<PartitionGroupBy>;
}) {
  if (group_by) {
    // @TODO: re-evaluate this: unfortunately each partition chart type has some specific number of allowed group by
    // dimensions, and that can be further extended with collapse_by. So this validation should probably be done
    // at the runtime level, not here in shared utils.
    // const hasStaticColoring = metrics.some((metric) => 'color' in metric && metric.color != null);
    // if (group_by.length && hasStaticColoring) {
    //   return 'Coloring cannot be assigned to metric dimensions when grouping dimensions are defined.';
    // }
    const breakdownsWithColoring = group_by.filter((def) => def.color != null);
    if (breakdownsWithColoring.length > 1) {
      return 'Coloring can only be assigned to a single grouping dimension.';
    }
    if (breakdownsWithColoring[0]?.collapse_by) {
      return 'Coloring cannot be assigned to a collapsed grouping dimension.';
    }
    const nonCollapsedGroupBy = group_by.filter(groupIsNotCollapsed);
    if (breakdownsWithColoring.length && nonCollapsedGroupBy[0] !== breakdownsWithColoring[0]) {
      return 'Coloring can only be assigned to the first non-collapsed grouping dimension.';
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
  const groupByDimensionNumber = (group_by && group_by.filter(groupIsNotCollapsed).length) || 0;
  if (metrics.length > 1) {
    if (groupByDimensionNumber > 0) {
      return 'When multiple metrics are defined, only collapsed group_by dimensions are allowed.';
    }
  } else {
    if (groupByDimensionNumber > 1) {
      return 'Only a single non-collapsed dimension is allowed for group_by';
    }
  }
}

export function validateMultipleMetricsCriteria(arg: {
  metrics: Array<PartitionMetric>;
  group_by?: Array<{ collapse_by?: string }>;
}) {
  return validateGroupings(arg) ?? validateColoringAssignments(arg);
}
