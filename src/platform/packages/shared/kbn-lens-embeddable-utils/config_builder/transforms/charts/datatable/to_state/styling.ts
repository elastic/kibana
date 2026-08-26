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
import type { DatatableConfig } from '../../../../schema';
import { stripUndefined } from '../../utils';
import { getAccessorName } from '../helpers';
import { METRIC_ACCESSOR_PREFIX, ROW_ACCESSOR_PREFIX } from '../constants';

function getSortingColumnId(
  sortBy: NonNullable<NonNullable<DatatableConfig['styling']>['sort_by']>
): string | undefined {
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

function buildSortingState(config: DatatableConfig): Pick<DatatableVisualizationState, 'sorting'> {
  if (!config.styling?.sort_by) {
    return {};
  }

  const columnId = getSortingColumnId(config.styling.sort_by);
  if (!columnId) {
    return {};
  }

  return {
    sorting: {
      columnId,
      direction: config.styling.sort_by.direction,
    },
  };
}

function buildDensityState(
  config: DatatableConfig
): Pick<
  DatatableVisualizationState,
  'headerRowHeight' | 'headerRowHeightLines' | 'rowHeight' | 'rowHeightLines' | 'density'
> {
  const headerRowHeight = config.styling?.density?.height?.header?.type;
  const headerRowHeightLines =
    config.styling?.density?.height?.header?.type === 'custom'
      ? config.styling?.density?.height?.header?.max_lines
      : undefined;
  const rowHeight = config.styling?.density?.height?.value?.type;
  const rowHeightLines =
    config.styling?.density?.height?.value?.type === 'custom'
      ? config.styling?.density?.height?.value?.lines
      : undefined;
  const density =
    config.styling?.density?.mode === 'default'
      ? LENS_DATAGRID_DENSITY.NORMAL
      : config.styling?.density?.mode;

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

function buildPagingState(config: DatatableConfig): Pick<DatatableVisualizationState, 'paging'> {
  if (!config.styling?.paging) {
    return {};
  }
  return { paging: { size: config.styling.paging, enabled: true } };
}

function buildShowRowNumbers(
  config: DatatableConfig
): Pick<DatatableVisualizationState, 'showRowNumbers'> {
  if (config.styling?.row_numbers == null) {
    return {};
  }
  return { showRowNumbers: config.styling.row_numbers.visible };
}

export function buildStylingState(
  config: DatatableConfig
): Pick<
  DatatableVisualizationState,
  | 'headerRowHeight'
  | 'headerRowHeightLines'
  | 'rowHeight'
  | 'rowHeightLines'
  | 'density'
  | 'paging'
  | 'sorting'
  | 'showRowNumbers'
> {
  return {
    ...buildDensityState(config),
    ...buildPagingState(config),
    ...buildSortingState(config),
    ...buildShowRowNumbers(config),
  };
}
