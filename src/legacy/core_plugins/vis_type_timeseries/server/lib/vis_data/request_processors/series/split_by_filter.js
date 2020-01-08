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

import { set } from 'lodash';
import { esQuery } from '../../../../../../../../plugins/data/server';

export function splitByFilter(req, panel, series, esQueryConfig, indexPattern) {
  return next => doc => {
    if (series.split_mode !== 'filter') {
      return next(doc);
    }

    set(
      doc,
      `aggs.${series.id}.filter`,
      esQuery.buildEsQuery(indexPattern, [series.filter], [], esQueryConfig)
    );

    return next(doc);
  };
}
