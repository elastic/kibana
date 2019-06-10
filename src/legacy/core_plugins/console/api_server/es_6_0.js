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
import { getSpec } from './spec';
const ES_6_0 = new Api('es_6_0');
const spec = getSpec();

// adding generated specs
Object.keys(spec).forEach(endpoint => {
  ES_6_0.addEndpointDescription(endpoint, spec[endpoint]);
});

//adding globals and custom API definitions
require('./es_6_0/aliases')(ES_6_0);
require('./es_6_0/aggregations')(ES_6_0);
require('./es_6_0/document')(ES_6_0);
require('./es_6_0/filter')(ES_6_0);
require('./es_6_0/globals')(ES_6_0);
require('./es_6_0/ingest')(ES_6_0);
require('./es_6_0/mappings')(ES_6_0);
require('./es_6_0/query')(ES_6_0);
require('./es_6_0/reindex')(ES_6_0);
require('./es_6_0/search')(ES_6_0);

export default ES_6_0;
