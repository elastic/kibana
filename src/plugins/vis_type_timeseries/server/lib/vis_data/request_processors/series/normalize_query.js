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
import { overwrite } from '../../helpers';
import _ from 'lodash';

const isEmptyFilter = (filter = {}) => Boolean(filter.match_all) && _.isEmpty(filter.match_all);
const hasSiblingPipelineAggregation = (aggs = {}) => Object.keys(aggs).length > 1;

/* For grouping by the 'Everything', the splitByEverything request processor
 * creates fake .filter.match_all filter (see split_by_everything.js) to simplify the request processors code.
 * But “filters” are not supported by all of available search strategies (e.g. Rollup search).
 * This method removes that aggregation.
 *
 * Important: for Sibling Pipeline aggregation we cannot apply this logic
 *
 */
function removeEmptyTopLevelAggregation(doc, series) {
  const filter = _.get(doc, `aggs.${series.id}.filter`);

  if (isEmptyFilter(filter) && !hasSiblingPipelineAggregation(doc.aggs[series.id].aggs)) {
    const meta = _.get(doc, `aggs.${series.id}.meta`);
    overwrite(doc, `aggs`, doc.aggs[series.id].aggs);
    overwrite(doc, `aggs.timeseries.meta`, meta);
  }

  return doc;
}

/* Last query handler in the chain. You can use this handler
 * as the last place where you can modify the "doc" (request body) object before sending it to ES.
 */
export function normalizeQuery(req, panel, series) {
  return (next) => (doc) => {
    return next(removeEmptyTopLevelAggregation(doc, series));
  };
}
