/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import buildTarget from '../../lib/build_target';

export default function tlConfigFn(setup) {
  let targetSeries;

  let tlConfig = {
    getTargetSeries: function () {
      return _.map(targetSeries, function (bucket) {
        // eslint-disable-line no-use-before-define
        return [bucket, null];
      });
    },
    setTargetSeries: function () {
      targetSeries = buildTarget(this);
    },
    writeTargetSeries: function (series) {
      targetSeries = _.map(series, function (p) {
        return p[0];
      });
    },
  };

  tlConfig = _.extend(tlConfig, setup);
  return tlConfig;
}
