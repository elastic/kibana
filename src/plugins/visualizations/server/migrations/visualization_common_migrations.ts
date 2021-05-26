/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';

export const commonAddSupportOfDualIndexSelectionModeInTSVB = (doc: any) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics') {
      const { params } = visState;

      if (typeof params?.index_pattern === 'string') {
        params.use_kibana_indexes = false;
      }

      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          visState: JSON.stringify(visState),
        },
      };
    }
  }
  return doc;
};

export const commonHideTSVBLastValueIndicator = (doc: any) => {
  try {
    const visState = JSON.parse(doc.attributes.visState);

    if (visState && visState.type === 'metrics' && visState.params.type !== 'timeseries')
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          visState: JSON.stringify({
            ...visState,
            params: {
              ...visState.params,
              hide_last_value_indicator: true,
            },
          }),
        },
      };
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
  }

  return doc;
};

export const commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel = (doc: any) => {
  const visStateJSON = get(doc, 'attributes.visState');
  let visState;

  if (visStateJSON) {
    try {
      visState = JSON.parse(visStateJSON);
    } catch (e) {
      // Let it go, the data is invalid and we'll leave it as is
    }
    if (visState && visState.type === 'metrics') {
      const { params } = visState;

      delete params.default_index_pattern;
      delete params.default_timefield;

      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          visState: JSON.stringify(visState),
        },
      };
    }
  }
  return doc;
};
