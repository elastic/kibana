/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import template from './timelion_help.html';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import moment from 'moment';

export function initTimelionHelpDirective(app) {
  app.directive('timelionHelp', function ($http) {
    return {
      restrict: 'E',
      template,
      controller: function ($scope) {
        $scope.functions = {
          list: [],
          details: null,
        };

        $scope.activeTab = 'funcref';
        $scope.activateTab = function (tabName) {
          $scope.activeTab = tabName;
        };

        function init() {
          $scope.es = {
            invalidCount: 0,
          };

          $scope.translations = {
            nextButtonLabel: i18n.translate('timelion.help.nextPageButtonLabel', {
              defaultMessage: 'Next',
            }),
            previousButtonLabel: i18n.translate('timelion.help.previousPageButtonLabel', {
              defaultMessage: 'Previous',
            }),
            dontShowHelpButtonLabel: i18n.translate('timelion.help.dontShowHelpButtonLabel', {
              defaultMessage: `Don't show this again`,
            }),
            strongNextText: i18n.translate('timelion.help.welcome.content.strongNextText', {
              defaultMessage: 'Next',
            }),
            emphasizedEverythingText: i18n.translate(
              'timelion.help.welcome.content.emphasizedEverythingText',
              {
                defaultMessage: 'everything',
              }
            ),
            notValidAdvancedSettingsPath: i18n.translate(
              'timelion.help.configuration.notValid.advancedSettingsPathText',
              {
                defaultMessage: 'Management / Kibana / Advanced Settings',
              }
            ),
            validAdvancedSettingsPath: i18n.translate(
              'timelion.help.configuration.valid.advancedSettingsPathText',
              {
                defaultMessage: 'Management/Kibana/Advanced Settings',
              }
            ),
            esAsteriskQueryDescription: i18n.translate(
              'timelion.help.querying.esAsteriskQueryDescriptionText',
              {
                defaultMessage: 'hey Elasticsearch, find everything in my default index',
              }
            ),
            esIndexQueryDescription: i18n.translate(
              'timelion.help.querying.esIndexQueryDescriptionText',
              {
                defaultMessage: 'use * as the q (query) for the logstash-* index',
              }
            ),
            strongAddText: i18n.translate('timelion.help.expressions.strongAddText', {
              defaultMessage: 'Add',
            }),
            twoExpressionsDescriptionTitle: i18n.translate(
              'timelion.help.expressions.examples.twoExpressionsDescriptionTitle',
              {
                defaultMessage: 'Double the fun.',
              }
            ),
            customStylingDescriptionTitle: i18n.translate(
              'timelion.help.expressions.examples.customStylingDescriptionTitle',
              {
                defaultMessage: 'Custom styling.',
              }
            ),
            namedArgumentsDescriptionTitle: i18n.translate(
              'timelion.help.expressions.examples.namedArgumentsDescriptionTitle',
              {
                defaultMessage: 'Named arguments.',
              }
            ),
            groupedExpressionsDescriptionTitle: i18n.translate(
              'timelion.help.expressions.examples.groupedExpressionsDescriptionTitle',
              {
                defaultMessage: 'Grouped expressions.',
              }
            ),
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
                field: resp.data.field,
              };
            } else {
              $scope.es.valid = false;
              $scope.es.invalidReason = (function () {
                try {
                  const esResp = JSON.parse(resp.data.resp.response);
                  return _.get(esResp, 'error.root_cause[0].reason');
                } catch (e) {
                  if (_.get(resp, 'data.resp.message')) return _.get(resp, 'data.resp.message');
                  if (_.get(resp, 'data.resp.output.payload.message'))
                    return _.get(resp, 'data.resp.output.payload.message');
                  return i18n.translate('timelion.help.unknownErrorMessage', {
                    defaultMessage: 'Unknown error',
                  });
                }
              })();
            }
            return $scope.es.valid;
          });
        }
        init();
      },
    };
  });
}
