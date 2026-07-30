/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_SPEC_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { SavedObjectReference } from '@kbn/core/server';
import { get } from 'lodash';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { toStoredTab } from '../../../common/embeddable/transform_utils';
import type {
  DiscoverSessionApiData,
  DiscoverSessionApiEsqlTab,
  DiscoverSessionApiTab,
} from '../schema';
import { transformControlPanelsIn } from './transform_control_panels';
import { transformVisContextIn } from './transform_vis_context';

const isEsqlTab = (tab: DiscoverSessionApiTab): tab is DiscoverSessionApiEsqlTab =>
  tab.data_source.type === AS_CODE_ESQL_DATA_SOURCE_TYPE;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Extracts the ES|QL data view fingerprint from Lens attributes.
 */
const extractEsqlFingerprint = (
  attributes: Record<string, unknown>
): { dataViewId: string; timeField?: string } | undefined => {
  const layers = get(attributes, 'state.datasourceStates.textBased.layers');
  if (!isRecord(layers)) return undefined;

  const layerIndexes = new Set<string>();

  for (const layer of Object.values(layers)) {
    if (isRecord(layer) && typeof layer.index === 'string' && layer.index.length > 0) {
      layerIndexes.add(layer.index);
    }
  }

  if (layerIndexes.size !== 1) return undefined;

  const [dataViewId] = layerIndexes;
  const adHocDataViews = get(attributes, 'state.adHocDataViews');

  if (!isRecord(adHocDataViews)) return undefined;
  const lensDataViewSpec = adHocDataViews[dataViewId];

  if (!isRecord(lensDataViewSpec) || lensDataViewSpec.type !== ESQL_TYPE) {
    return undefined;
  }

  return {
    dataViewId,
    ...(typeof lensDataViewSpec.timeFieldName === 'string' &&
      lensDataViewSpec.timeFieldName !== '' && { timeField: lensDataViewSpec.timeFieldName }),
  };
};

const getVisContextRequestData = (tab: DiscoverSessionApiTab) => {
  const esqlFingerprint = tab.vis_context
    ? extractEsqlFingerprint(tab.vis_context.attributes)
    : undefined;

  if (esqlFingerprint) {
    return {
      dataViewId: esqlFingerprint.dataViewId,
      ...(esqlFingerprint.timeField !== undefined && { timeField: esqlFingerprint.timeField }),
      ...(tab.breakdown_field !== undefined &&
        tab.breakdown_field !== '' && { breakdownField: tab.breakdown_field }),
    };
  }

  const dataViewId =
    tab.data_source.type !== AS_CODE_DATA_VIEW_SPEC_TYPE && 'ref_id' in tab.data_source
      ? tab.data_source.ref_id
      : undefined;
  const timeField =
    tab.data_source.type === AS_CODE_DATA_VIEW_SPEC_TYPE && 'time_field' in tab.data_source
      ? tab.data_source.time_field
      : undefined;

  return {
    ...(dataViewId !== undefined && { dataViewId }),
    ...(timeField !== undefined && { timeField }),
    ...(!isEsqlTab(tab) &&
      tab.chart_interval !== undefined && { timeInterval: tab.chart_interval }),
    ...(tab.breakdown_field !== undefined &&
      tab.breakdown_field !== '' && { breakdownField: tab.breakdown_field }),
  };
};

export const transformDiscoverSessionIn = (
  data: DiscoverSessionApiData
): { attributes: DiscoverSessionAttributes; references: SavedObjectReference[] } => {
  const references: SavedObjectReference[] = [];

  const tabs: DiscoverSessionAttributes['tabs'] = data.tabs.map((tab) => {
    const { state: tabAttributes, references: tabReferences } = toStoredTab(tab, {
      refNamePrefix: `tab_${tab.id}`,
    });

    references.push(...tabReferences);

    return {
      id: tab.id,
      label: tab.label,
      attributes: {
        ...tabAttributes,
        hideChart: tab.hide_chart,
        hideTable: tab.hide_table,
        hideAggregatedPreview: tab.hide_aggregated_preview,
        breakdownField: tab.breakdown_field,
        chartInterval: tab.chart_interval,
        timeRestore: tab.time_restore,
        timeRange: tab.time_range,
        refreshInterval: tab.refresh_interval,
        visContext: transformVisContextIn(tab.vis_context, getVisContextRequestData(tab)),
        controlGroupJson: transformControlPanelsIn(tab.control_panels),
        usesAdHocDataView: tab.data_source.type === AS_CODE_DATA_VIEW_SPEC_TYPE,
      },
    };
  });

  return {
    attributes: {
      title: data.title,
      description: data.description,
      tabs,
    },
    references,
  };
};
