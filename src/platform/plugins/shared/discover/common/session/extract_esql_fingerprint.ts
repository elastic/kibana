/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TYPE } from '@kbn/data-view-utils';
import { get } from 'lodash';

/** Reads the ES|QL data view ID and time field from a chart with one referenced data view. */
export const extractEsqlFingerprint = (
  attributes: Record<string, unknown>
): { dataViewId: string; timeField?: string } | undefined => {
  const layers = get(attributes, 'state.datasourceStates.textBased.layers');

  if (!isRecord(layers)) {
    return undefined;
  }

  const layerIndexes = new Set<string>();

  for (const layer of Object.values(layers)) {
    if (isRecord(layer) && typeof layer.index === 'string' && layer.index.length > 0) {
      layerIndexes.add(layer.index);
    }
  }

  if (layerIndexes.size !== 1) {
    return undefined;
  }

  const [dataViewId] = layerIndexes;
  const adHocDataViews = get(attributes, 'state.adHocDataViews');

  if (!isRecord(adHocDataViews)) {
    return undefined;
  }

  const dataViewSpec = adHocDataViews[dataViewId];
  if (!isRecord(dataViewSpec) || dataViewSpec.type !== ESQL_TYPE) {
    return undefined;
  }

  return {
    dataViewId,
    ...(typeof dataViewSpec.timeFieldName === 'string' &&
      dataViewSpec.timeFieldName !== '' && { timeField: dataViewSpec.timeFieldName }),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
