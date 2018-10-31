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
import $ from 'jquery';
import collectBranch from './_collect_branch';
import numeral from 'numeral';

export function HierarchicalTooltipFormatterProvider($rootScope, $compile, $sce) {
  const $tooltip = $(require('ui/agg_response/hierarchical/_tooltip.html'));
  const $tooltipScope = $rootScope.$new();

  $compile($tooltip)($tooltipScope);

  return function (columns) {
    return function (event) {
      const datum = event.datum;

      // Collect the current leaf and parents into an array of values
      $tooltipScope.rows = collectBranch(datum);

      const metricCol = $tooltipScope.metricCol = columns.find(column => column.aggConfig.type.type === 'metrics');

      // Map those values to what the tooltipSource.rows format.
      _.forEachRight($tooltipScope.rows, function (row) {
        row.spacer = $sce.trustAsHtml(_.repeat('&nbsp;', row.depth));

        let percent;
        if (row.item.percentOfGroup != null) {
          percent = row.item.percentOfGroup;
        }

        row.metric = metricCol.aggConfig.fieldFormatter()(row.metric);

        if (percent != null) {
          row.metric += ' (' + numeral(percent).format('0.[00]%') + ')';
        }

        return row;
      });

      $tooltipScope.$apply();
      return $tooltip[0].outerHTML;
    };

  };

}
