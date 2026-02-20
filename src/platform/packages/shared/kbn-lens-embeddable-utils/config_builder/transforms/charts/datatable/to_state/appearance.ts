/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DatatableVisualizationState } from '@kbn/lens-common';
import { LENS_DATAGRID_DENSITY } from '@kbn/lens-common';
import { getTransposeId, TRANSPOSE_SEPARATOR } from '@kbn/transpose-utils';
import type { DatatableState } from '../../../../schema';
import { stripUndefined } from '../../utils';
import { getAccessorName } from '../helpers';
import { METRIC_ACCESSOR_PREFIX, ROW_ACCESSOR_PREFIX } from '../constants';

function getSortingColumnId(sortBy: NonNullable<DatatableState['sort_by']>): string | undefined {
  switch (sortBy.column_type) {
    case 'metric':
      return getAccessorName(METRIC_ACCESSOR_PREFIX, sortBy.index);
    case 'row':
      return getAccessorName(ROW_ACCESSOR_PREFIX, sortBy.index);
    case 'pivoted_metric': {
      const metricColumnId = getAccessorName(METRIC_ACCESSOR_PREFIX, sortBy.index);
      return getTransposeId(sortBy.values.join(TRANSPOSE_SEPARATOR), metricColumnId);
    }
    default:
      return undefined;
  }
}

function buildSortingState(config: DatatableState): Pick<DatatableVisualizationState, 'sorting'> {
  if (!config.sort_by) {
    return {};
  }

  const columnId = getSortingColumnId(config.sort_by);
  if (!columnId) {
    return {};
  }

  return {
    sorting: {
      columnId,
      direction: config.sort_by.direction,
    },
  };
}

function buildDensityState(
  config: DatatableState
): Pick<
  DatatableVisualizationState,
  'headerRowHeight' | 'headerRowHeightLines' | 'rowHeight' | 'rowHeightLines' | 'density'
> {
  const headerRowHeight = config.density?.height?.header?.type;
  const headerRowHeightLines =
    config.density?.height?.header?.type === 'custom'
      ? config.density?.height?.header?.max_lines
      : undefined;
  const rowHeight = config.density?.height?.value?.type;
  const rowHeightLines =
    config.density?.height?.value?.type === 'custom'
      ? config.density?.height?.value?.lines
      : undefined;
  const density =
    config.density?.mode === 'default' ? LENS_DATAGRID_DENSITY.NORMAL : config.density?.mode;

  return stripUndefined<
    Pick<
      DatatableVisualizationState,
      'headerRowHeight' | 'headerRowHeightLines' | 'rowHeight' | 'rowHeightLines' | 'density'
    >
  >({
    headerRowHeight,
    headerRowHeightLines,
    rowHeight,
    rowHeightLines,
    density,
  });
}

function buildPagingState(config: DatatableState): Pick<DatatableVisualizationState, 'paging'> {
  if (!config.paging) {
    return {};
  }
  return { paging: { size: config.paging, enabled: true } };
}

export function buildAppearanceState(
  config: DatatableState
): Pick<
  DatatableVisualizationState,
  | 'headerRowHeight'
  | 'headerRowHeightLines'
  | 'rowHeight'
  | 'rowHeightLines'
  | 'density'
  | 'paging'
  | 'sorting'
> {
  return {
    ...buildDensityState(config),
    ...buildPagingState(config),
    ...buildSortingState(config),
  };
}
