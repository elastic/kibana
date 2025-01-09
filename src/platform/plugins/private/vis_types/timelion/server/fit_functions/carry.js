/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

// Upsampling of non-cumulative sets
// Good: average, min, max
// Bad: sum, count

// Don't use this to down sample, it simply won't do the right thing.
export default function carry(dataTuples, targetTuples) {
  if (dataTuples.length > targetTuples.length) {
    throw new Error(
      i18n.translate('timelion.fitFunctions.carry.downSampleErrorMessage', {
        defaultMessage: `Don't use the 'carry' fit method to down sample, use 'scale' or 'average'`,
        description:
          '"carry", "scale" and "average" are parameter values that must not be translated.',
      })
    );
  }

  let currentCarry = dataTuples[0][1];
  return _.map(targetTuples, function (bucket) {
    const targetTime = bucket[0];
    const dataTime = dataTuples[0][0];

    if (dataTuples[0] && targetTime >= dataTime) {
      currentCarry = dataTuples[0][1];
      if (dataTuples.length > 1) {
        dataTuples.shift();
      }
    }

    return [bucket[0], currentCarry];
  });
}
