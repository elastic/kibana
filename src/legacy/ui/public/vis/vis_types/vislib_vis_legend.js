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
import { i18n } from '@kbn/i18n';
import html from './vislib_vis_legend.html';
import { Data } from '../../vislib/lib/data';
import { uiModules } from '../../modules';
import { VisFiltersProvider } from '../vis_filters';
import { htmlIdGenerator, keyCodes } from '@elastic/eui';
import { getTableAggs } from '../../visualize/loader/pipeline_helpers/utilities';

export const CUSTOM_LEGEND_VIS_TYPES = ['heatmap', 'gauge'];

uiModules.get('kibana')
  .directive('vislibLegend', function (Private, $timeout) {
    const visFilters = Private(VisFiltersProvider);

    return {
      restrict: 'E',
      template: html,
      link: function ($scope) {
        $scope.legendId = htmlIdGenerator()('legend');
        $scope.open = $scope.uiState.get('vis.legendOpen', true);

        $scope.$watch('visData', function (data) {
          if (!data) return;
          $scope.data = data;
        });

        $scope.$watch('refreshLegend', () => {
          refresh();
        });

        $scope.highlight = function (event) {
          const el = event.currentTarget;
          const handler = $scope.vis.vislibVis.handler;

          //there is no guarantee that a Chart will set the highlight-function on its handler
          if (!handler || typeof handler.highlight !== 'function') {
            return;
          }
          handler.highlight.call(el, handler.el);
        };

        $scope.unhighlight = function (event) {
          const el = event.currentTarget;
          const handler = $scope.vis.vislibVis.handler;
          //there is no guarantee that a Chart will set the unhighlight-function on its handler
          if (!handler || typeof handler.unHighlight !== 'function') {
            return;
          }
          handler.unHighlight.call(el, handler.el);
        };

        $scope.setColor = function (label, color) {
          const colors = $scope.uiState.get('vis.colors') || {};
          if (colors[label] === color) delete colors[label];
          else colors[label] = color;
          $scope.uiState.setSilent('vis.colors', null);
          $scope.uiState.set('vis.colors', colors);
          $scope.uiState.emit('colorChanged');
          refresh();
        };

        $scope.toggleLegend = function () {
          const bwcAddLegend = $scope.vis.params.addLegend;
          const bwcLegendStateDefault = bwcAddLegend == null ? true : bwcAddLegend;
          $scope.open = !$scope.uiState.get('vis.legendOpen', bwcLegendStateDefault);
          // open should be applied on template before we update uiState
          $timeout(() => {
            $scope.uiState.set('vis.legendOpen', $scope.open);
          });
        };

        $scope.filter = function (legendData, negate) {
          $scope.vis.API.events.filter({ data: legendData.values, negate: negate });
        };

        $scope.canFilter = function (legendData) {
          if (CUSTOM_LEGEND_VIS_TYPES.includes($scope.vis.vislibVis.visConfigArgs.type)) {
            return false;
          }
          const filters = visFilters.filter({ aggConfigs: $scope.tableAggs, data: legendData.values }, { simulate: true });
          return filters.length;
        };

        /**
       * Keydown listener for a legend entry.
       * This will close the details panel of this legend entry when pressing Escape.
       */
        $scope.onLegendEntryKeydown = function (event) {
          if (event.keyCode === keyCodes.ESCAPE) {
            event.preventDefault();
            event.stopPropagation();
            $scope.shownDetails = undefined;
          }
        };

        $scope.toggleDetails = function (label) {
          $scope.shownDetails = $scope.shownDetails === label ? undefined : label;
        };

        $scope.areDetailsVisible = function (label) {
          return $scope.shownDetails === label;
        };

        $scope.colors = [
          '#3F6833', '#967302', '#2F575E', '#99440A', '#58140C', '#052B51', '#511749', '#3F2B5B', //6
          '#508642', '#CCA300', '#447EBC', '#C15C17', '#890F02', '#0A437C', '#6D1F62', '#584477', //2
          '#629E51', '#E5AC0E', '#64B0C8', '#E0752D', '#BF1B00', '#0A50A1', '#962D82', '#614D93', //4
          '#7EB26D', '#EAB839', '#6ED0E0', '#EF843C', '#E24D42', '#1F78C1', '#BA43A9', '#705DA0', // Normal
          '#9AC48A', '#F2C96D', '#65C5DB', '#F9934E', '#EA6460', '#5195CE', '#D683CE', '#806EB7', //5
          '#B7DBAB', '#F4D598', '#70DBED', '#F9BA8F', '#F29191', '#82B5D8', '#E5A8E2', '#AEA2E0', //3
          '#E0F9D7', '#FCEACA', '#CFFAFF', '#F9E2D2', '#FCE2DE', '#BADFF4', '#F9D9F9', '#DEDAF7'  //7
        ];

        function refresh() {
          const vislibVis = $scope.vis.vislibVis;
          if (!vislibVis || !vislibVis.visConfig) {
            $scope.labels = [{ label: i18n.translate('common.ui.vis.visTypes.legend.loadingLabel', { defaultMessage: 'loading…' }) }];
            return;
          }  // make sure vislib is defined at this point

          if ($scope.uiState.get('vis.legendOpen') == null && $scope.vis.params.addLegend != null) {
            $scope.open = $scope.vis.params.addLegend;
          }

          if (CUSTOM_LEGEND_VIS_TYPES.includes(vislibVis.visConfigArgs.type)) {
            const labels = vislibVis.getLegendLabels();
            if (labels) {
              $scope.labels = _.map(labels, label => {
                return { label: label };
              });
            }
          } else {
            $scope.labels = getLabels($scope.data, vislibVis.visConfigArgs.type);
          }

          if (vislibVis.visConfig) {
            $scope.getColor = vislibVis.visConfig.data.getColorFunc();
          }

          $scope.tableAggs = getTableAggs($scope.vis);
        }

        // Most of these functions were moved directly from the old Legend class. Not a fan of this.
        function getLabels(data, type) {
          if (!data) return [];
          data = data.columns || data.rows || [data];
          if (type === 'pie') return Data.prototype.pieNames(data);
          return getSeriesLabels(data);
        }

        function getSeriesLabels(data) {
          const values = data.map(function (chart) {
            return chart.series;
          })
            .reduce(function (a, b) {
              return a.concat(b);
            }, []);
          return _.compact(_.uniq(values, 'label')).map(label => {
            return {
              ...label,
              values: [label.values[0].seriesRaw],
            };
          });
        }
      }
    };
  });
