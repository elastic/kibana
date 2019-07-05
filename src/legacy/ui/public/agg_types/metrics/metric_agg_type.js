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
import { AggType } from '../agg_type';
import { fieldFormats } from '../../registry/field_formats';
import { createLegacyClass } from '../../utils/legacy_class';
import { i18n } from '@kbn/i18n';

createLegacyClass(MetricAggType).inherits(AggType);
function MetricAggType(config) {
  MetricAggType.Super.call(this, config);

  // allow overriding any value on the prototype
  _.forOwn(config, function (val, key) {
    if (_.has(MetricAggType.prototype, key)) {
      this[key] = val;
    }
  }, this);
}

MetricAggType.prototype.subtype = i18n.translate('common.ui.aggTypes.metrics.metricAggregationsSubtypeTitle', {
  defaultMessage: 'Metric Aggregations'
});
/**
 * Read the values for this metric from the
 * @param  {[type]} bucket [description]
 * @return {*}        [description]
 */
MetricAggType.prototype.getValue = function (agg, bucket) {
  // Metric types where an empty set equals `zero`
  const isSettableToZero = ['cardinality', 'sum'].indexOf(agg.__type.name) !== -1;

  // Return proper values when no buckets are present
  // `Count` handles empty sets properly
  if (!bucket[agg.id] && isSettableToZero) return 0;

  return bucket[agg.id] && bucket[agg.id].value;
};

/**
 * Pick a format for the values produced by this agg type,
 * overridden by several metrics that always output a simple
 * number
 *
 * @param  {agg} agg - the agg to pick a format for
 * @return {FieldFormat}
 */
MetricAggType.prototype.getFormat = function (agg) {
  const field = agg.getField();
  return field ? field.format : fieldFormats.getDefaultInstance('number');
};

/**
 * Determines if this metric can be scaled
 */
MetricAggType.prototype.isScalable = function () {
  return false;
};

export { MetricAggType };
