/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import { PanelSchema, IndexPatternObject, FetchedIndexPattern } from '../common/types';
import { IndexPatternsService } from '../../data/common';

export const isStringTypeIndexPattern = (
  indexPatternObject: IndexPatternObject
): indexPatternObject is string => typeof indexPatternObject === 'string';

export const getIndexPatternObjectKey = (indexPatternObject: IndexPatternObject) =>
  isStringTypeIndexPattern(indexPatternObject) ? indexPatternObject : indexPatternObject?.id ?? '';

export const extractIndexPatternObjects = (
  panel: PanelSchema,
  defaultIndex?: PanelSchema['default_index_pattern']
) => {
  const patterns: IndexPatternObject[] = [];

  if (panel.index_pattern) {
    patterns.push(panel.index_pattern);
  }

  panel.series.forEach((series) => {
    const indexPattern = series.series_index_pattern;
    if (indexPattern && series.override_index_pattern) {
      patterns.push(indexPattern);
    }
  });

  if (panel.annotations) {
    panel.annotations.forEach((item) => {
      const indexPattern = item.index_pattern;
      if (indexPattern) {
        patterns.push(indexPattern);
      }
    });
  }

  if (patterns.length === 0 && defaultIndex) {
    patterns.push(defaultIndex);
  }

  return uniq<IndexPatternObject>(patterns).sort();
};

export const fetchIndexPattern = async (
  indexPatternObject: IndexPatternObject,
  indexPatternsService: Pick<IndexPatternsService, 'getDefault' | 'get' | 'find'>
): Promise<FetchedIndexPattern> => {
  let indexPattern: FetchedIndexPattern['indexPattern'];
  let indexPatternString: string = '';

  if (!indexPatternObject) {
    indexPattern = await indexPatternsService.getDefault();
  } else {
    if (isStringTypeIndexPattern(indexPatternObject)) {
      indexPattern = (await indexPatternsService.find(indexPatternObject)).find(
        (index) => index.title === indexPatternObject
      );

      if (!indexPattern) {
        indexPatternString = indexPatternObject;
      }
    } else if (indexPatternObject.id) {
      indexPattern = await indexPatternsService.get(indexPatternObject.id);
    }
  }

  return {
    indexPattern,
    indexPatternString: indexPattern?.title ?? indexPatternString,
  };
};
