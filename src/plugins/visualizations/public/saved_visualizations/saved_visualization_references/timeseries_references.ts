/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '../../../../../core/types';

/** @internal **/
const REF_NAME_POSTFIX = '_ref_name';

/** @internal **/
enum INDEX_TYPE {
  KIBANA_INDEX_PATTERN = 'index-pattern',
  STRING_INDEX_PATTERN = 'string-index-pattern',
}

/** @internal **/
type Action = (object: Record<string, any>, key: string) => void;

const doForExtractedIndices = (action: Action, visState: Record<string, any>) => {
  if (visState.type !== 'metrics') {
    return;
  }

  action(visState.params, 'index_pattern');

  visState.params.series.forEach((series: any) => {
    if (series.override_index_pattern) {
      action(series, 'series_index_pattern');
    }
  });

  if (visState.params.annotations) {
    visState.params.annotations.forEach((annotation: any) => {
      action(annotation, 'index_pattern');
    });
  }
};

export const extractTimeSeriesReferences = (
  visState: Record<string, any>,
  references: SavedObjectReference[] = []
) => {
  let i = 0;

  doForExtractedIndices((object, key) => {
    if (object[key]) {
      const name = `ref_${++i}_index_pattern`;

      object[key + REF_NAME_POSTFIX] = name;
      references.push({
        name,
        type: object[key].id ? INDEX_TYPE.KIBANA_INDEX_PATTERN : INDEX_TYPE.STRING_INDEX_PATTERN,
        id: object[key].id || object[key],
      });
      delete object[key];
    }
  }, visState);
};

export const injectTimeSeriesReferences = (
  visState: Record<string, any>,
  references: SavedObjectReference[]
) => {
  doForExtractedIndices((object, key) => {
    const refKey = key + REF_NAME_POSTFIX;

    if (object[refKey]) {
      const refValue = references.find((ref) => ref.name === object[refKey]);

      if (refValue) {
        object[key] =
          refValue.type === INDEX_TYPE.KIBANA_INDEX_PATTERN ? { id: refValue.id } : refValue.id;
      }

      delete object[refKey];
    }
  }, visState);
};
