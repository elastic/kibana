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

import { safeMakeLabel } from './safe_make_label';
import { i18n } from '@kbn/i18n';

const siblingPipelineAggController = function (type) {
  return function ($scope) {
    const metricTitle = i18n.translate('common.ui.aggTypes.metrics.metricTitle', {
      defaultMessage: 'Metric'
    });
    const bucketTitle = i18n.translate('common.ui.aggTypes.metrics.bucketTitle', {
      defaultMessage: 'Bucket'
    });

    $scope.aggType = type;
    $scope.aggTitle = type === 'customMetric' ? metricTitle : bucketTitle;
    $scope.aggGroup = type === 'customMetric' ? 'metrics' : 'buckets';
    $scope.safeMakeLabel = safeMakeLabel;

    function updateAgg() {
      const agg = $scope.agg;
      const params = agg.params;
      const paramDef = agg.type.params.byName[type];

      params[type] = params[type] || paramDef.makeAgg(agg);
    }

    updateAgg();
  };
};

export { siblingPipelineAggController };
