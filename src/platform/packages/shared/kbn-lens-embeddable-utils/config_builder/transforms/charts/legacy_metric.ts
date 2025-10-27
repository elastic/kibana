/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  FormBasedLayer,
  FormBasedPersistedState,
  LegacyMetricState as LegacyMetricVisualizationState,
  PersistedIndexPatternLayer,
  TextBasedLayer,
} from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/types';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../types';
import {
  addLayerColumn,
  buildDatasetState,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  getAdhocDataviews,
  operationFromColumn,
} from '../utils';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import type { LensApiState, LegacyMetricState } from '../../schema';
import { fromMetricAPItoLensState } from '../columns/metric';
import type { LensApiAllMetricOperations } from '../../schema/metric_ops';
import type { DeepMutable, DeepPartial } from '../utils';
import { generateLayer } from '../utils';
import type {
  LegacyMetricStateESQL,
  LegacyMetricStateNoESQL,
} from '../../schema/charts/legacy_metric';
import { getSharedChartLensStateToAPI, getSharedChartAPIToLensState } from './utils';
import { fromColorByValueAPIToLensState, fromColorByValueLensStateToAPI } from '../coloring';
import { isEsqlTableTypeDataset } from '../../utils';

const ACCESSOR = 'metric_formula_accessor';
const LENS_DEFAULT_LAYER_ID = 'layer_0';

function buildVisualizationState(config: LegacyMetricState): LegacyMetricVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    accessor: ACCESSOR,
    size: layer.metric.size,
    titlePosition: layer.metric.alignments?.labels,
    textAlign: layer.metric.alignments?.value,
    ...(layer.metric.apply_color_to && layer.metric.color
      ? {
          colorMode: layer.metric.apply_color_to === 'background' ? 'Background' : 'Labels',
          palette: fromColorByValueAPIToLensState(layer.metric.color),
        }
      : { colorMode: 'None' }),
  };
}

function reverseBuildVisualizationState(
  visualization: LegacyMetricVisualizationState,
  layer: FormBasedLayer | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): LegacyMetricState {
  if (visualization.accessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataset = buildDatasetState(layer, adHocDataViews, references, adhocReferences, layerId);

  if (!dataset || dataset.type == null) {
    throw new Error('Unsupported dataset type');
  }

  const props: DeepPartial<DeepMutable<LegacyMetricState>> = {
    ...generateApiLayer(layer),
    metric: isEsqlTableTypeDataset(dataset)
      ? getValueApiColumn(visualization.accessor, layer as TextBasedLayer)
      : (operationFromColumn(
          visualization.accessor,
          layer as FormBasedLayer
        ) as LensApiAllMetricOperations),
  } as LegacyMetricState;

  if (props.metric) {
    if (visualization.size) {
      props.metric.size = visualization.size as LegacyMetricState['metric']['size'];
    }

    if (visualization.titlePosition || visualization.textAlign) {
      props.metric.alignments = {
        ...(visualization.titlePosition ? { labels: visualization.titlePosition } : {}),
        ...(visualization.textAlign ? { value: visualization.textAlign } : {}),
      };
    }

    if (visualization.colorMode && visualization.colorMode !== 'None' && visualization.palette) {
      props.metric.apply_color_to =
        visualization.colorMode === 'Background' ? 'background' : 'value';

      const colorByValue = fromColorByValueLensStateToAPI(visualization.palette);
      if (colorByValue?.range === 'absolute') {
        props.metric.color = colorByValue;
      }
    }
  }

  return {
    type: 'legacy_metric',
    dataset: dataset satisfies LegacyMetricState['dataset'],
    ...props,
  } as LegacyMetricState;
}

function buildFormBasedLayer(layer: LegacyMetricStateNoESQL): FormBasedPersistedState['layers'] {
  const columns = fromMetricAPItoLensState(layer.metric as LensApiAllMetricOperations);

  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(DEFAULT_LAYER_ID, layer);
  const defaultLayer = layers[DEFAULT_LAYER_ID];

  addLayerColumn(defaultLayer, ACCESSOR, columns);

  return layers;
}

function getValueColumns(layer: LegacyMetricStateESQL) {
  return [getValueColumn(ACCESSOR, layer.metric.column, 'number')];
}

export function fromAPItoLensState(config: LegacyMetricState): LensAttributes {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as LegacyMetricStateNoESQL);

  const { layers, usedDataviews } = buildDatasourceStates(config, _buildDataLayer, getValueColumns);

  const visualization = buildVisualizationState(config);

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);
  const regularDataViews = Object.values(usedDataviews).filter(
    (v): v is { id: string; type: 'dataView' } => v.type === 'dataView'
  );
  const references = regularDataViews.length
    ? buildReferences({ [LENS_DEFAULT_LAYER_ID]: regularDataViews[0]?.id })
    : [];

  return {
    visualizationType: 'lnsLegacyMetric',
    ...getSharedChartAPIToLensState(config),
    references,
    state: {
      datasourceStates: layers,
      internalReferences,
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization,
      adHocDataViews: config.dataset.type === 'index' ? adHocDataViews : {},
    },
  };
}

export function fromLensStateToAPI(
  config: LensAttributes
): Extract<LensApiState, { type: 'legacy_metric' }> {
  const { state } = config;
  const visualization = state.visualization as LegacyMetricVisualizationState;
  const layers =
    state.datasourceStates.formBased?.layers ?? state.datasourceStates.textBased?.layers ?? [];

  const [layerId, layer] = Object.entries(layers)[0];

  const visualizationState = {
    ...getSharedChartLensStateToAPI(config),
    ...reverseBuildVisualizationState(
      visualization,
      layer,
      layerId ?? LENS_DEFAULT_LAYER_ID,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences
    ),
  };

  return visualizationState;
}
