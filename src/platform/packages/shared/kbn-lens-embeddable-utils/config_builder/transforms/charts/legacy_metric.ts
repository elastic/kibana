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
  TypedLensSerializedState,
} from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/types';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../constants';
import {
  addLayerColumn,
  buildDataSourceState,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  getAdhocDataviews,
  operationFromColumn,
} from '../utils';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import type { LensApiConfig, LegacyMetricConfig } from '../../schema';
import { fromMetricAPItoLensState } from '../columns/metric';
import type { DeepMutable, DeepPartial } from '../utils';
import { generateLayer } from '../utils';
import type {
  LegacyMetricConfigESQL,
  LegacyMetricConfigNoESQL,
} from '../../schema/charts/legacy_metric';
import {
  getSharedChartLensStateToAPI,
  getSharedChartAPIToLensState,
  getLensStateLayer,
  getDatasourceLayers,
} from './utils';
import {
  AUTO_COLOR,
  fromColorByValueAPIToLensState,
  fromColorByValueLensStateToAPI,
  isAutoColor,
  isColorByValueAbsolute,
} from '../coloring';
import { isEsqlTableTypeDataSource } from '../../utils';
import { stripUndefined } from './utils';

const ACCESSOR = 'legacy_metric_accessor';

function buildVisualizationState(config: LegacyMetricConfig): LegacyMetricVisualizationState {
  const layer = config;

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    accessor: ACCESSOR,
    size: layer.metric.size,
    titlePosition: layer.metric.labels?.alignment,
    textAlign: layer.metric.values?.alignment,
    ...(layer.metric.apply_color_to
      ? stripUndefined({
          colorMode: layer.metric.apply_color_to === 'background' ? 'Background' : 'Labels',
          palette:
            layer.metric.color && !isAutoColor(layer.metric.color)
              ? fromColorByValueAPIToLensState(layer.metric.color)
              : undefined,
        })
      : { colorMode: 'None' }),
  };
}

function reverseBuildVisualizationState(
  visualization: LegacyMetricVisualizationState,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): LegacyMetricConfig {
  if (visualization.accessor == null) {
    throw new Error('Metric accessor is missing in the visualization state');
  }

  const dataSource = buildDataSourceState(
    layer,
    layerId,
    adHocDataViews,
    references,
    adhocReferences
  );

  if (!dataSource || dataSource.type == null || isEsqlTableTypeDataSource(dataSource)) {
    throw new Error('Unsupported DataSource type');
  }

  const props: DeepPartial<DeepMutable<LegacyMetricConfig>> = {
    ...generateApiLayer(layer),
    metric: isEsqlTableTypeDataSource(dataSource)
      ? getValueApiColumn(visualization.accessor, layer as TextBasedLayer)
      : operationFromColumn(visualization.accessor, layer as FormBasedLayer),
  } as LegacyMetricConfig;

  if (props.metric) {
    if (visualization.size) {
      props.metric.size = visualization.size as LegacyMetricConfig['metric']['size'];
    }

    if (visualization.titlePosition || visualization.textAlign) {
      if (visualization.titlePosition) {
        props.metric.labels = {
          alignment: visualization.titlePosition,
        };
      }
      if (visualization.textAlign) {
        props.metric.values = {
          alignment: visualization.textAlign,
        };
      }
    }

    if (visualization.colorMode && visualization.colorMode !== 'None') {
      props.metric.apply_color_to =
        visualization.colorMode === 'Background' ? 'background' : 'value';

      const color = fromColorByValueLensStateToAPI(visualization.palette) ?? AUTO_COLOR;
      if (isColorByValueAbsolute(color) || isAutoColor(color)) {
        props.metric.color = color;
      }
    }
  }

  return {
    type: 'legacy_metric',
    data_source: dataSource satisfies LegacyMetricConfig['data_source'],
    ...props,
  } as LegacyMetricConfig;
}

function buildFormBasedLayer(layer: LegacyMetricConfigNoESQL): FormBasedPersistedState['layers'] {
  const columns = fromMetricAPItoLensState(layer.metric);

  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(DEFAULT_LAYER_ID, layer);
  const defaultLayer = layers[DEFAULT_LAYER_ID];

  addLayerColumn(defaultLayer, ACCESSOR, columns);

  return layers;
}

function getValueColumns(layer: LegacyMetricConfigESQL) {
  return [getValueColumn(ACCESSOR, layer.metric, 'number')];
}

type LegacyMetricAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsLegacyMetric' }
>;

type LegacyMetricAttributesWithoutFiltersAndQuery = Omit<LegacyMetricAttributes, 'state'> & {
  state: Omit<LegacyMetricAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(
  config: LegacyMetricConfig
): LegacyMetricAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as LegacyMetricConfigNoESQL);

  const { layers, usedDataviews } = buildDatasourceStates(config, _buildDataLayer, getValueColumns);

  const visualization = buildVisualizationState(config);

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);
  const regularDataViews = Object.values(usedDataviews).filter(
    (v): v is { id: string; type: 'dataView' } => v.type === 'dataView'
  );
  const references = regularDataViews.length
    ? buildReferences({ [DEFAULT_LAYER_ID]: regularDataViews[0]?.id })
    : [];

  return {
    visualizationType: 'lnsLegacyMetric',
    ...getSharedChartAPIToLensState(config),
    references,
    version: LENS_ITEM_LATEST_VERSION,
    state: {
      datasourceStates: layers,
      internalReferences,
      visualization,
      adHocDataViews,
    },
  };
}

export function fromLensStateToAPI(
  config: LensAttributes
): Extract<LensApiConfig, { type: 'legacy_metric' }> {
  const { state } = config;
  const visualization = state.visualization as LegacyMetricVisualizationState;
  const layers = getDatasourceLayers(state);
  const [layerId, layer] = getLensStateLayer(layers, visualization.layerId);

  const visualizationState = {
    ...getSharedChartLensStateToAPI(config),
    ...reverseBuildVisualizationState(
      visualization,
      layer,
      layerId ?? DEFAULT_LAYER_ID,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences
    ),
  };

  return visualizationState;
}
