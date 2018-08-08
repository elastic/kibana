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

import 'ui/notify';
import 'ui/courier';
import 'ui/doc_viewer';
import 'ui/index_patterns';
import html from '../index.html';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { timefilter } from 'ui/timefilter';


const app = uiModules.get('apps/doc', [
  'kibana/notify',
  'kibana/courier',
  'kibana/index_patterns'
]);


const resolveIndexPattern = {
  indexPattern: function (indexPatterns, savedSearches, $route) {
    return indexPatterns.get($route.current.params.indexPattern);
  }
};

uiRoutes
  .when('/doc/:indexPattern/:index/:type/:id', {
    template: html,
    resolve: resolveIndexPattern
  })
  .when('/doc/:indexPattern/:index/:type', {
    template: html,
    resolve: resolveIndexPattern
  });

app.controller('doc', function ($scope, $route, es) {

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  // Pretty much only need this for formatting, not actually using it for fetching anything.
  $scope.indexPattern = $route.current.locals.indexPattern;

  const computedFields = $scope.indexPattern.getComputedFields();

  es.search({
    index: $route.current.params.index,
    body: {
      query: {
        ids: {
          type: $route.current.params.type,
          values: [$route.current.params.id]
        }
      },
      stored_fields: computedFields.storedFields,
      _source: true,
      script_fields: computedFields.scriptFields,
      docvalue_fields: computedFields.docvalueFields
    }
  }).then(function (resp) {
    if (resp.hits) {
      if (resp.hits.total < 1) {
        $scope.status = 'notFound';
      } else {
        $scope.status = 'found';
        $scope.hit = resp.hits.hits[0];
      }
    }
  }).catch(function (err) {
    if (err.status === 404) {
      $scope.status = 'notFound';
    } else {
      $scope.status = 'error';
      $scope.resp = err;
    }
  });

});
