/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { TextBasedPersistedState } from '@kbn/lens-common';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

export const enrichLensAttributesWithTablesData = ({
  attributes,
  table,
}: {
  attributes: LensAttributes;
  table: Datatable | undefined;
}): LensAttributes => {
  if (!attributes.state.datasourceStates.textBased) {
    return attributes;
  }

  const layers = attributes.state.datasourceStates.textBased?.layers;

  if (!layers) {
    return attributes;
  }

  const updatedAttributes = {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...attributes.state.datasourceStates.textBased,
          layers: {} as TextBasedPersistedState['layers'],
        },
      },
    },
  };

  for (const key of Object.keys(layers)) {
    const newLayer = { ...layers[key], table };
    if (!table) {
      delete newLayer.table;
    }
    updatedAttributes.state.datasourceStates.textBased.layers[key] = newLayer;
  }

  return updatedAttributes;
};

export const removeTablesFromLensAttributes = (
  attributes: LensAttributes
): TypedLensByValueInput => {
  return {
    attributes: stripHistogramOverlay(
      enrichLensAttributesWithTablesData({ attributes, table: undefined })
    ),
  };
};

const isGeneratedColumn = (value: string, generated: Set<string>): boolean => generated.has(value);

const restoreVisualizationLayer = <TLayer extends { layerId?: string; accessors?: string[] }>(
  layer: TLayer,
  restoredByLayerId: Map<string, { totalColumnId: string; generated: Set<string> }>
): TLayer => {
  const restored =
    typeof layer.layerId === 'string' ? restoredByLayerId.get(layer.layerId) : undefined;

  if (!restored) {
    return layer;
  }

  const accessors = (layer.accessors ?? []).filter(
    (accessor) => !isGeneratedColumn(accessor, restored.generated)
  );
  const layerWithYConfig = layer as TLayer & { yConfig?: unknown[] };
  const nextYConfig = layerWithYConfig.yConfig?.filter((entry) => {
    if (typeof entry !== 'object' || entry === null || !('forAccessor' in entry)) {
      return true;
    }

    return (
      typeof entry.forAccessor !== 'string' ||
      !isGeneratedColumn(entry.forAccessor, restored.generated)
    );
  });
  const nextLayer: TLayer & { yConfig?: unknown[] } = {
    ...layer,
    accessors: accessors.length > 0 ? accessors : [restored.totalColumnId],
  };

  if (nextYConfig && nextYConfig.length > 0) {
    nextLayer.yConfig = nextYConfig;
  } else {
    delete nextLayer.yConfig;
  }

  return nextLayer;
};

/** Drops runtime overlay metadata so a saved or edited chart stays a plain histogram. */
export const stripHistogramOverlay = (attributes: LensAttributes): LensAttributes => {
  const layers = attributes.state.datasourceStates.textBased?.layers;

  if (!layers || !Object.values(layers).some((layer) => layer.histogramOverlay)) {
    return attributes;
  }

  const restoredByLayerId = new Map<string, { totalColumnId: string; generated: Set<string> }>();
  const nextLayers = Object.fromEntries(
    Object.entries(layers).map(([key, layer]) => {
      const histogramOverlay = layer.histogramOverlay;

      if (!histogramOverlay) {
        return [key, layer];
      }

      const generated = new Set([histogramOverlay.overlayColumn, histogramOverlay.remainderColumn]);
      const totalColumnId =
        layer.columns.find((column) => column.fieldName === histogramOverlay.totalColumn)
          ?.columnId ?? histogramOverlay.totalColumn;
      restoredByLayerId.set(key, { totalColumnId, generated });

      const { histogramOverlay: _histogramOverlay, columns, ...rest } = layer;
      return [
        key,
        {
          ...rest,
          columns: columns.filter(
            (column) =>
              !isGeneratedColumn(column.fieldName, generated) &&
              !isGeneratedColumn(column.columnId, generated)
          ),
        },
      ];
    })
  );

  const visualization = attributes.state.visualization;
  const nextVisualization =
    visualization &&
    typeof visualization === 'object' &&
    'layers' in visualization &&
    Array.isArray(visualization.layers)
      ? {
          ...visualization,
          layers: visualization.layers.map((layer) =>
            layer && typeof layer === 'object'
              ? restoreVisualizationLayer(layer, restoredByLayerId)
              : layer
          ),
        }
      : visualization;

  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: {
          ...attributes.state.datasourceStates.textBased,
          layers: nextLayers,
        },
      },
      visualization: nextVisualization,
    },
  };
};
