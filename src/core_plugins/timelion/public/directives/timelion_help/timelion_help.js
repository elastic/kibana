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

import template from './timelion_help.html';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import moment from 'moment';

const app = uiModules.get('apps/timelion', []);

app.directive('timelionHelp', function ($http, i18n) {
  return {
    restrict: 'E',
    template,
    controller: function ($scope) {
      $scope.functions = {
        list: [],
        details: null
      };

      function init() {
        $scope.es = {
          invalidCount: 0
        };

        $scope.translations = {
          firstTimeConfigurationLink:
            '<a ng-click="es.valid = false">' +
            i18n('timelion.help.configuration.firstTimeConfigurationLink', {
              defaultMessage: 'First time configuration',
            }) +
            '</a>',
          welcomeFunctionReferenceLink:
            '<a ng-click="setPage(0)">' +
            i18n('timelion.help.welcome.functionReferenceLink', {
              defaultMessage: 'Jump to the function reference',
            }) +
            '</a>',
          nextButtonText: i18n('timelion.help.nextPageButton', {
            defaultMessage: 'Next',
          }),
          previousButtonText: i18n('timelion.help.previousPageButton', {
            defaultMessage: 'Previous',
          }),
          dontShowHelpButtonText: i18n('timelion.help.dontShowHelpButton', {
            defaultMessage: 'Don\'t show this again',
          }),
          intervalIsAutoMessage:
            '<span ng-show="state.interval == \'auto\'"><strong>' +
            i18n('timelion.help.configuration.valid.intervals.content.intervalIsAuto', {
              defaultMessage: 'You\'re all set!',
            }) +
            '</strong></span>',
          intervalIsNotAutoMessage:
            '<span ng-show="state.interval != \'auto\'">' +
            i18n(
              'timelion.help.configuration.valid.intervals.content.intervalIsNotAuto',
              {
                defaultMessage: 'Set it to {auto} to let Timelion choose an appropriate interval.',
                values: { auto: '<code>auto </code>' },
              }
            ) +
            '</span>',
          luceneQueryLinkMessage:
            `<a
              href="https://www.elastic.co/guide/en/elasticsearch/reference/5.1/query-dsl-query-string-query.html#query-string-syntax"
              target="_blank"
              rel="noopener noreferrer"
            >` +
            i18n('timelion.help.querying.luceneQueryLink', {
              defaultMessage: 'Lucene query string',
            }) +
            '</a>',
          metricAggregationLinkMessage:
            `<a
              href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics.html"
              target="_blank"
              rel="noopener noreferrer"
            >` +
            i18n('timelion.help.querying.count.metricAggregationLink', {
              defaultMessage: 'Elasticsearch metric aggregation',
            }) +
            '</a>',
          functionReferenceLink:
            '<a ng-click="setPage(0)">' +
            i18n('timelion.help.functionReferenceLink', {
              defaultMessage: 'Function reference',
            }) +
            '</a>',
          welcomePageLink:
            `<a
              class="kuiLink"
              ng-click="setPage(1)"
              kbn-accessible-click
            >` +
            i18n('timelion.help.mainPage.functionReference.welcomePageLink', {
              defaultMessage: 'Check out the tutorial',
            }) +
            '</a>',
        };

        getFunctions();
        checkElasticsearch();
      }

      function getFunctions() {
        return $http.get('../api/timelion/functions').then(function (resp) {
          $scope.functions.list = resp.data;
        });
      }
      $scope.recheckElasticsearch = function () {
        $scope.es.valid = null;
        checkElasticsearch().then(function (valid) {
          if (!valid) $scope.es.invalidCount++;
        });
      };

      function checkElasticsearch() {
        return $http.get('../api/timelion/validate/es').then(function (resp) {
          if (resp.data.ok) {

            $scope.es.valid = true;
            $scope.es.stats = {
              min: moment(resp.data.min).format('LLL'),
              max: moment(resp.data.max).format('LLL'),
              field: resp.data.field
            };
          } else {
            $scope.es.valid = false;
            $scope.es.invalidReason = (function () {
              try {
                const esResp = JSON.parse(resp.data.resp.response);
                return _.get(esResp, 'error.root_cause[0].reason');
              } catch (e) {
                if (_.get(resp, 'data.resp.message')) return _.get(resp, 'data.resp.message');
                if (_.get(resp, 'data.resp.output.payload.message')) return _.get(resp, 'data.resp.output.payload.message');
                return i18n('timelion.help.unknownErrorMessage', { defaultMessage: 'Unknown error' });
              }
            }());
          }
          return $scope.es.valid;
        });
      }
      init();
    }
  };
});
