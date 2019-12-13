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
import buildTarget from '../../lib/build_target.js';

export default function tlConfigFn(setup) {
  let targetSeries;

  let tlConfig = {
    getTargetSeries: function () {
      return _.map(targetSeries, function (bucket) { // eslint-disable-line no-use-before-define
        return [bucket, null];
      });
    },
    setTargetSeries: function () {
      targetSeries = buildTarget(this);
    },
    writeTargetSeries: function (series) {
      targetSeries = _.map(series, function (p) {return p[0];});
    }
  };

  tlConfig = _.extend(tlConfig, setup);
  return tlConfig;
}
