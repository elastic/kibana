/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty } from 'lodash';
import type { LensAttributes } from '../../types';

interface AccessorMapping {
  xAccessor: 'x';
  yAccessor: 'y';
  accessors: 'y';
  splitAccessor: 'breakdown';
}

type AccessorKey = keyof AccessorMapping;

interface LayerWithAccessors {
  layerType: string;
  seriesType?: string;
  layerId: string;
  [key: string]: unknown;
}

/**
 * Reshapes Lens attributes to align with the format produced by transform functions.
 *
 * Transformations include:
 * - Removing empty objects (e.g., incompleteColumns)
 * - Converting indexpattern layer type to formBased
 * - Removing indexPatternId from formBased layers
 * - Rewriting layer and column IDs to match generated convention
 */
export function reshapeAttributes(attributes: LensAttributes): LensAttributes {
  const ACCESSOR_TYPE_MAP: AccessorMapping = {
    xAccessor: 'x',
    yAccessor: 'y',
    accessors: 'y',
    splitAccessor: 'breakdown',
  };

  // Extract and normalize datasource state
  const datasource = attributes.state.datasourceStates;
  const datasourceState = extractDatasourceState(datasource);
  const layers = datasourceState.formBased?.layers ?? datasourceState.textBased?.layers;

  // Normalize layers
  if (layers) {
    Object.values(layers).forEach(normalizeDatasourceLayer);
  }

  // Build ID mapping from visualization config
  const visualization = attributes.state.visualization;
  const idsMap = buildIdMapping(visualization, ACCESSOR_TYPE_MAP);

  // Create reshaped attributes with updated IDs
  const reshapedAttributes: LensAttributes = {
    ...attributes,
    state: {
      ...attributes.state,
      visualization,
      datasourceStates: datasourceState,
    },
    references: attributes.references.filter(
      (ref) => ref.name !== 'indexpattern-datasource-current-indexpattern'
    ),
  };

  // Apply ID remapping throughout the structure
  remapIds(reshapedAttributes, idsMap);

  return reshapedAttributes;
}

/**
 * Extracts and normalizes the datasource state, handling legacy indexpattern format
 */
function extractDatasourceState(datasource: LensAttributes['state']['datasourceStates']) {
  if (!isEmpty(datasource.formBased?.layers)) {
    return { formBased: { layers: datasource.formBased.layers } };
  }

  if (!isEmpty(datasource.textBased?.layers)) {
    return { textBased: { layers: datasource.textBased.layers } };
  }

  // Handle legacy indexpattern datasource (migration bug fallback)
  const legacyLayers =
    (
      datasource as LensAttributes['state']['datasourceStates'] & {
        indexpattern: LensAttributes['state']['datasourceStates']['formBased'];
      }
    ).indexpattern?.layers ?? {};
  return {
    formBased: { layers: legacyLayers },
  };
}

/**
 * Normalizes a datasource layer by removing deprecated fields and adding defaults
 */
function normalizeDatasourceLayer(layer: Record<string, unknown>): void {
  // Remove deprecated fields
  if ('indexPatternId' in layer) {
    delete layer.indexPatternId;
  }
  if ('incompleteColumns' in layer) {
    delete layer.incompleteColumns;
  }

  // Add default values
  if (!('ignoreGlobalFilters' in layer)) {
    layer.ignoreGlobalFilters = false;
  }
  if (!('sampling' in layer)) {
    layer.sampling = 1;
  }
}

/**
 * Builds a mapping of original IDs to generated IDs based on visualization config
 */
function buildIdMapping(
  visualization: LensAttributes['state']['visualization'],
  accessorTypeMap: AccessorMapping
): Record<string, string> {
  const idsMap: Record<string, string> = {};

  if (
    visualization &&
    typeof visualization === 'object' &&
    'layers' in visualization &&
    Array.isArray(visualization.layers)
  ) {
    // Handle multi-layer visualizations (e.g., XY charts)
    visualization.layers.forEach((layer: LayerWithAccessors, index: number) => {
      mapLayerIds(layer, idsMap, accessorTypeMap, index);
    });
  } else {
    // Handle single-layer visualizations (e.g., metric charts)
    mapSingleLayerIds(visualization as LayerWithAccessors, idsMap);
  }

  return idsMap;
}

/**
 * Maps IDs for a single layer in a multi-layer visualization
 */
function mapLayerIds(
  layer: LayerWithAccessors,
  idsMap: Record<string, string>,
  accessorTypeMap: AccessorMapping,
  layerIndex: number
): void {
  // Map layer ID
  if (layer.layerId) {
    const layerPrefix = layer.seriesType ?? layer.layerType;
    idsMap[layer.layerId] = `${layerPrefix}_${layerIndex}`;
  }

  // Map accessor IDs
  Object.entries(layer).forEach(([propName, value]) => {
    if (/accessor/i.test(propName) && propName in accessorTypeMap) {
      const accessorType = accessorTypeMap[propName as AccessorKey];
      const seriesType = layer.seriesType ?? 'unknown';

      if (Array.isArray(value)) {
        value.forEach((accessor: string, accessorIndex: number) => {
          idsMap[accessor] = `${seriesType}_${accessorType}_${accessorIndex}`;
        });
      } else if (typeof value === 'string') {
        idsMap[value] = `${seriesType}_${accessorType}`;
      }
    }

    // Map annotation IDs
    if (propName === 'annotations' && Array.isArray(value)) {
      value.forEach((accessor: string, accessorIndex: number) => {
        idsMap[accessor] = `annotation_${accessorIndex}`;
      });
    }
  });
}

/**
 * Maps IDs for single-layer visualizations (e.g., metric)
 */
function mapSingleLayerIds(
  visualization: LayerWithAccessors,
  idsMap: Record<string, string>
): void {
  if (visualization.layerId) {
    idsMap[visualization.layerId] = 'layer_0';
  }

  Object.entries(visualization).forEach(([propName, value]) => {
    if (/accessor/i.test(propName) && typeof value === 'string') {
      idsMap[value] = 'metric_formula_accessor';
    }
  });
}

/**
 * Recursively remaps IDs throughout the attributes object
 */
function remapIds(obj: any, idsMap: Record<string, string>): void {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      obj[index] = remapIdValue(item, idsMap);
      if (typeof obj[index] === 'object' && obj[index] !== null) {
        remapIds(obj[index], idsMap);
      }
    });
    return;
  }

  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  const entries = Object.entries(obj);
  entries.forEach(([key, value]) => {
    const newKey = remapIdValue(key, idsMap) as string;
    const newValue = remapIdValue(value, idsMap);

    if (newKey !== key) {
      delete obj[key];
      obj[newKey] = newValue;
    } else {
      obj[key] = newValue;
    }

    if (typeof newValue === 'object' && newValue !== null) {
      remapIds(obj[newKey], idsMap);
    }
  });
}

/**
 * Remaps a single ID value (string or array of strings)
 */
function remapIdValue(value: unknown, idsMap: Record<string, string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => remapIdValue(item, idsMap));
  }

  if (typeof value === 'string') {
    // Direct mapping
    if (value in idsMap) {
      return idsMap[value];
    }

    // Handle layer reference format
    const layerPrefix = 'indexpattern-datasource-layer-';
    if (value.startsWith(layerPrefix)) {
      const layerId = value.replace(layerPrefix, '');
      if (layerId in idsMap) {
        return `${layerPrefix}${idsMap[layerId]}`;
      }
    }
  }

  return value;
}
