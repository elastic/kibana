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

import Api from './api';
import { getSpec } from './json';
import { register } from './js/ingest';
const ES = new Api('es');

export const loadSpec = () => {
  const spec = getSpec();

  // adding generated specs
  Object.keys(spec).forEach(endpoint => {
    ES.addEndpointDescription(endpoint, spec[endpoint]);
  });

  // adding globals and custom API definitions
  require('./js/aliases')(ES);
  require('./js/aggregations')(ES);
  require('./js/document')(ES);
  require('./js/filter')(ES);
  require('./js/globals')(ES);
  register(ES);
  require('./js/mappings')(ES);
  require('./js/settings')(ES);
  require('./js/query')(ES);
  require('./js/reindex')(ES);
  require('./js/search')(ES);
};

export default ES;
