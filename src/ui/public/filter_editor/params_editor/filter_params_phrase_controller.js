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
import chrome from '../../chrome';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');

export function filterParamsPhraseController($http, $scope, config) {
  const shouldSuggestValues = this.shouldSuggestValues = config.get('filterEditor:suggestValues');

  this.compactUnion = _.flow(_.union, _.compact);

  this.getValueSuggestions = _.memoize(getValueSuggestions, getFieldQueryHash);

  this.refreshValueSuggestions = (query) => {
    return this.getValueSuggestions($scope.field, query)
      .then(suggestions => $scope.valueSuggestions = suggestions);
  };

  this.refreshValueSuggestions();

  function getValueSuggestions(field, query) {
    if (!shouldSuggestValues || !_.get(field, 'aggregatable') || field.type !== 'string') {
      return Promise.resolve([]);
    }

    const params = {
      query,
      field: field.name
    };

    return $http.post(`${baseUrl}/${field.indexPattern.title}`, params)
      .then(response => response.data)
      .catch(() => []);
  }

  function getFieldQueryHash(field, query = '') {
    return `${field.indexPattern.id}/${field.name}/${query}`;
  }
}
