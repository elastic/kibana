/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableVisualizationState, FormBasedLayer, TextBasedLayer } from '@kbn/lens-common';
import { parseTransposeId, getTransposeId, TRANSPOSE_SEPARATOR } from '@kbn/transpose-utils';
import {
  DEFAULT_ROW_HEIGHT_LINES,
  DEFAULT_HEADER_ROW_HEIGHT_LINES,
} from '@kbn/lens-common/visualizations/datatable/constants';

import type { LensAttributes } from '../../../../types';
import { mergeNormalizers } from './normalize';
import type { AttributesNormalizer, NormalizerConfig } from './normalize';
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getCommonNormalizer, getPaletteNormalizer } from './common';
import {
  getAccessorName,
  isMetricColumnNoESQL,
  isMetricColumnESQL,
} from '../../../../transforms/charts/datatable/helpers';

type DatatableAttributes = Extract<LensAttributes, { visualizationType: 'lnsDatatable' }>;

type DatatableColumn = DatatableVisualizationState['columns'][number];

/**
 * Sort visualization columns by semantic type: rows first, then split_metrics_by, then metrics.
 * Within each group, sort by columnId for stable ordering.
 * This is the sorting logic used by the transform.
 */
function sortByColumnType(a: DatatableColumn, b: DatatableColumn): number {
  const rank = (col: DatatableColumn) => {
    if (col.isMetric) {
      return 2; // metric
    }
    if (col.isTransposed) {
      return 1; // split_metrics_by
    }
    return 0; // row
  };
  const diff = rank(a) - rank(b);
  return diff !== 0 ? diff : a.columnId.localeCompare(b.columnId, undefined, { numeric: true });
}

/**
 * Remove duplicate visualization columns by columnId.
 * Stale duplicates can appear from drag-and-drop or copy operations that didn't clean up.
 */
function deduplicateColumns(columns: DatatableColumn[]): DatatableColumn[] {
  const seen = new Set<string>();
  return columns.filter((col) => {
    if (seen.has(col.columnId)) return false;
    seen.add(col.columnId);
    return true;
  });
}

function getColumnRemappingFormBased(
  visualization: DatatableVisualizationState,
  layer: Omit<FormBasedLayer, 'indexPatternId'>
): IdRemapping {
  const columnStateMap = new Map(visualization.columns.map((col) => [col.columnId, col]));

  let metricIndex = 0;
  let rowIndex = 0;
  let splitMetricByIndex = 0;

  const remapping: IdRemapping = [];

  for (const columnId of layer.columnOrder) {
    const column = columnStateMap.get(columnId);
    if (!column) continue;

    if (isMetricColumnNoESQL(column, layer.columns[columnId] as any)) {
      remapping.push([columnId, getAccessorName('metric', metricIndex++)]);
    } else if (column.isTransposed) {
      remapping.push([columnId, getAccessorName('split_metric_by', splitMetricByIndex++)]);
    } else {
      remapping.push([columnId, getAccessorName('row', rowIndex++)]);
    }
  }

  // Remap internal reference columns (e.g., max referenced by counter_rate)
  // These are not in visualization.columns but exist in the datasource layer.
  // Exclude formula columns — their internal math references are cleared separately.
  let refIndex = 0;
  for (const [oldId] of [...remapping]) {
    if (!oldId) {
      continue;
    }
    const dsCol = layer.columns[oldId];
    if (dsCol?.operationType === 'formula') {
      continue;
    }
    // references array is only present on ReferenceBasedIndexPatternColumn
    if (Array.isArray((dsCol as any)?.references)) {
      for (const refId of (dsCol as any).references) {
        if (layer.columns[refId]) {
          remapping.push([refId, getAccessorName('metric_ref', refIndex++)]);
        }
      }
    }
  }

  return remapping;
}

function getColumnRemappingTextBased(
  visualization: DatatableVisualizationState,
  layer: TextBasedLayer
): IdRemapping {
  const columnStateMap = new Map(visualization.columns.map((col) => [col.columnId, col]));

  let metricIndex = 0;
  let rowIndex = 0;
  let splitMetricByIndex = 0;

  const remapping: IdRemapping = [];

  for (const { columnId } of layer.columns) {
    const column = columnStateMap.get(columnId);
    if (!column) continue;

    if (isMetricColumnESQL(column, layer.columns)) {
      remapping.push([columnId, getAccessorName('metric', metricIndex++)]);
    } else if (column.isTransposed) {
      remapping.push([columnId, getAccessorName('split_metric_by', splitMetricByIndex++)]);
    } else {
      remapping.push([columnId, getAccessorName('row', rowIndex++)]);
    }
  }

  return remapping;
}

function getColumnRemapping(
  visualization: DatatableVisualizationState,
  datasourceStates: LensAttributes['state']['datasourceStates']
): IdRemapping {
  const formBasedState =
    datasourceStates.formBased ??
    ((datasourceStates as any).indexpattern as typeof datasourceStates.formBased);
  const formBasedLayer = Object.values(formBasedState?.layers ?? {})[0];
  if (formBasedLayer) {
    return getColumnRemappingFormBased(visualization, formBasedLayer);
  }

  const textBasedLayer = Object.values(datasourceStates.textBased?.layers ?? {})[0];
  if (textBasedLayer) {
    return getColumnRemappingTextBased(visualization, textBasedLayer);
  }

  return [];
}

/**
 * Precompute the remapping from the original (unmutated) state,
 * then pass it to both the common normalizer and the visualization ID normalizer.
 * This avoids the ordering issue where getCommonNormalizer (order: -1) mutates
 * datasource column IDs before alignId tries to read them.
 */
export const normalizeDatatable: AttributesNormalizer<DatatableAttributes> = (attributes) => {
  const { visualization, datasourceStates } = attributes.original.state;
  const columnRemapping = getColumnRemapping(visualization, datasourceStates);
  const layerRemapping: IdRemapping = [[visualization.layerId, DEFAULT_LAYER_ID]];

  const alignId: NormalizerConfig<DatatableAttributes> = {
    original: (attrs) => {
      const viz = attrs.state.visualization;
      const idMap = new Map(
        columnRemapping.filter((pair): pair is [string, string] => pair[0] != null)
      );
      viz.layerId = DEFAULT_LAYER_ID;

      for (const col of viz.columns) {
        col.columnId = idMap.get(col.columnId) ?? col.columnId;
      }

      if (viz.sorting?.columnId) {
        const parsed = parseTransposeId(viz.sorting.columnId);
        if (parsed) {
          const mapped = idMap.get(parsed.id);
          if (mapped) {
            viz.sorting.columnId = getTransposeId(parsed.values.join(TRANSPOSE_SEPARATOR), mapped);
          }
        } else {
          viz.sorting.columnId = idMap.get(viz.sorting.columnId) ?? viz.sorting.columnId;
        }
      }
      return attrs;
    },
  };

  // Build a type map from old column ID → { isMetric, isTransposed }
  // derived from the accessor name assigned during classification.
  // Original SOs may omit these. The transform always sets them explicitly.
  const columnTypeMap = new Map(
    columnRemapping
      .filter((pair): pair is [string, string] => pair[0] != null)
      .map(([oldId, newId]) => [
        oldId,
        {
          isMetric: newId.includes('_metric_') && !newId.includes('_split_metric_by_'),
          isTransposed: newId.includes('_split_metric_by_'),
        },
      ])
  );

  const alignColumnTypes: NormalizerConfig<DatatableAttributes> = {
    original: (attrs) => {
      for (const col of attrs.state.visualization.columns) {
        const types = columnTypeMap.get(col.columnId);
        if (types) {
          col.isMetric = types.isMetric;
          col.isTransposed = types.isTransposed;
        }
      }
      return attrs;
    },
  };

  const alignLegacyTypes: NormalizerConfig<DatatableAttributes> = {
    original: (attrs) => {
      const vis = attrs.state.visualization;
      // 'single' is a legacy rowHeight value that maps to 'custom' with rowHeightLines: 1
      if ((vis.rowHeight as string) === 'single') {
        vis.rowHeight = 'custom';
      }
      // 'single' is a legacy headerRowHeight value that maps to 'custom' with headerRowHeightLines: 1
      if ((vis.headerRowHeight as string) === 'single') {
        vis.headerRowHeight = 'custom';
      }
      // When rowHeight is absent but lines are set, should fallback to 'custom'
      if (!vis.rowHeight && vis.rowHeightLines) {
        vis.rowHeight = 'custom';
      }
      // When headerRowHeight is absent but lines are set, should fallback to 'custom'
      if (!vis.headerRowHeight && vis.headerRowHeightLines) {
        vis.headerRowHeight = 'custom';
      }
      // rowHeightLines is meaningless when rowHeight is 'auto'; the transform does not set it
      if (vis.rowHeight === 'auto' && vis.rowHeightLines) {
        delete vis.rowHeightLines;
      }
      // headerRowHeightLines is meaningless when headerRowHeight is 'auto'; the transform does not set it
      if (vis.headerRowHeight === 'auto' && vis.headerRowHeightLines) {
        delete vis.headerRowHeightLines;
      }
      // when rowHeight is 'custom' and rowHeightLines is not set, Lens defaults to DEFAULT_ROW_HEIGHT_LINES (1)
      if (vis.rowHeight === 'custom' && vis.rowHeightLines === undefined) {
        vis.rowHeightLines = DEFAULT_ROW_HEIGHT_LINES;
      }
      // when headerRowHeight is 'custom' and headerRowHeightLines is not set, Lens defaults to DEFAULT_HEADER_ROW_HEIGHT_LINES (3)
      if (vis.headerRowHeight === 'custom' && vis.headerRowHeightLines === undefined) {
        vis.headerRowHeightLines = DEFAULT_HEADER_ROW_HEIGHT_LINES;
      }
      // paging with enabled: false is the default; the transform does not produce it
      if (vis.paging && !vis.paging.enabled) {
        delete vis.paging;
      }
      // The API schema only supports paging sizes [10, 20, 30, 50, 100] -> non-standard sizes are normalized to 10
      if (vis.paging?.enabled && ![10, 20, 30, 50, 100].includes(vis.paging.size)) {
        vis.paging.size = 10;
      }
      // If the sorting direction is not set, set it to 'asc'
      if (vis.sorting && vis.sorting.columnId && !vis.sorting.direction) {
        vis.sorting.direction = 'asc';
      }
      // if sorting is null, delete it
      if (vis.sorting === null || (vis.sorting && vis.sorting.columnId === undefined)) {
        delete vis.sorting;
      }
      // fitRowToContent is a runtime-only expression arg derived from rowHeight === 'auto' -> should not be persisted
      if ((vis as any).fitRowToContent) {
        delete (vis as any).fitRowToContent;
      }
      for (const col of vis.columns) {
        // colorMode 'none' is the default and equivalent to not setting it (the majority of the columns do not have a colorMode set at all - meaning no coloring)
        if (col.colorMode === 'none') {
          delete col.colorMode;
        }
        // summaryRow on non-metric columns is a legacy artifact -> the API only supports summary on metrics
        if (!col.isMetric && col.summaryRow) {
          delete col.summaryRow;
          delete col.summaryLabel;
        }
        // summaryRow 'none' is the default, equivalent to not setting it
        if (col.summaryRow === 'none') {
          delete col.summaryRow;
          delete col.summaryLabel;
        }
        // When colorMapping is present, palette is redundant (legacy) and dropped by the transform
        if (col.colorMapping && col.palette) {
          delete col.palette;
        }
        // When colorMapping is null, delete it
        if (col.colorMapping === null) {
          delete col.colorMapping;
        }
        // When palette is null, delete it
        if (col.palette === null) {
          delete col.palette;
        }
        // collapseFn '', equivalent to not setting it
        if ((col.collapseFn as string) === '') {
          delete col.collapseFn;
        }
      }
      return attrs;
    },
  };

  const sortColumns: NormalizerConfig<DatatableAttributes> = {
    original: (attrs) => {
      attrs.state.visualization.columns = deduplicateColumns(attrs.state.visualization.columns);
      attrs.state.visualization.columns.sort(sortByColumnType);
      return attrs;
    },
  };

  return mergeNormalizers<DatatableAttributes>([
    getCommonNormalizer<DatatableAttributes>(() => ({
      layerRemapping,
      columnRemapping,
    })),
    alignColumnTypes,
    alignLegacyTypes,
    alignId,
    sortColumns,
    getPaletteNormalizer<DatatableAttributes>('state.visualization.columns.*.palette'),
  ])(attributes);
};
