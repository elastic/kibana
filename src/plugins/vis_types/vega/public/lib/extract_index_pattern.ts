/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flatten } from 'lodash';
import { getDataViews } from '../services';

import type { Data, VegaSpec } from '../data_model/types';
import type { DataView } from '../../../../data_views/public';

export const extractIndexPatternsFromSpec = async (spec: VegaSpec) => {
  const dataViews = getDataViews();
  let data: Data[] = [];

  if (Array.isArray(spec.data)) {
    data = spec.data;
  } else if (spec.data) {
    data = [spec.data];
  }

  return flatten<DataView>(
    await Promise.all(
      data.reduce<Array<Promise<DataView[]>>>((accumulator, currentValue) => {
        if (currentValue.url?.index) {
          accumulator.push(dataViews.find(currentValue.url.index));
        }

        return accumulator;
      }, [])
    )
  );
};
