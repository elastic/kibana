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

import { VisSavedObject } from '../types';
import type { IndexPattern } from '../../../../plugins/data/public';
import { getIndexPatterns } from '../services';

export async function getIndexPattern(
  savedVis: VisSavedObject
): Promise<IndexPattern | undefined | null> {
  if (savedVis.visState.type !== 'metrics') {
    return savedVis.searchSource!.getField('index');
  }

  const indexPatternsClient = getIndexPatterns();

  return savedVis.visState.params.index_pattern
    ? (await indexPatternsClient.find(`"${savedVis.visState.params.index_pattern}"`))[0]
    : await indexPatternsClient.getDefault();
}
