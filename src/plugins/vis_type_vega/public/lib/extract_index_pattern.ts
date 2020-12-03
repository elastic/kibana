/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
