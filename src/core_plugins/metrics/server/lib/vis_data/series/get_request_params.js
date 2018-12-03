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

import buildRequestBody from './build_request_body';

export default (req, panel, series) => {
  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const bodies = [];

  bodies.push({
    index: indexPattern,
    ignoreUnavailable: true,
  });

  const body = buildRequestBody(req, panel, series);
  body.timeout = '90s';
  bodies.push(body);
  return bodies;
};
