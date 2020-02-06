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

import _ from 'lodash';

class Api {
  constructor(name) {
    this.globalRules = {};
    this.endpoints = {};
    this.name = name;
  }

  addGlobalAutocompleteRules = (parentNode, rules) => {
    this.globalRules[parentNode] = rules;
  };

  addEndpointDescription = (endpoint, description = {}) => {
    let copiedDescription = {};
    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint] };
    }
    let urlParamsDef;
    _.each(description.patterns || [], function(p) {
      if (p.indexOf('{indices}') >= 0) {
        urlParamsDef = urlParamsDef || {};
        urlParamsDef.ignore_unavailable = '__flag__';
        urlParamsDef.allow_no_indices = '__flag__';
        urlParamsDef.expand_wildcards = ['open', 'closed'];
      }
    });

    if (urlParamsDef) {
      description.url_params = _.extend(description.url_params || {}, copiedDescription.url_params);
      _.defaults(description.url_params, urlParamsDef);
    }

    _.extend(copiedDescription, description);
    _.defaults(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET'],
    });

    this.endpoints[endpoint] = copiedDescription;
  };

  asJson() {
    return {
      name: this.name,
      globals: this.globalRules,
      endpoints: this.endpoints,
    };
  }
}

export default Api;
