/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { flatten } from 'lodash';
import { getData } from '../services';

import type { Data, VegaSpec } from '../data_model/types';
import type { IndexPattern } from '../../../data/public';

export const extractIndexPatternsFromSpec = async (spec: VegaSpec) => {
  const { indexPatterns } = getData();
  let data: Data[] = [];

  if (Array.isArray(spec.data)) {
    data = spec.data;
  } else if (spec.data) {
    data = [spec.data];
  }

  return flatten<IndexPattern>(
    await Promise.all(
      data.reduce<Array<Promise<IndexPattern[]>>>((accumulator, currentValue) => {
        if (currentValue.url?.index) {
          accumulator.push(indexPatterns.find(currentValue.url.index));
        }

        return accumulator;
      }, [])
    )
  );
};
