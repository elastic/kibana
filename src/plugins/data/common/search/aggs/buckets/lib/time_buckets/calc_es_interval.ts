/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import dateMath, { Unit } from '@kbn/datemath';

import { parseEsInterval } from '../../../utils';

const unitsDesc = dateMath.unitsDesc;
const largeMax = unitsDesc.indexOf('w');

export interface EsInterval {
  expression: string;
  unit: Unit;
  value: number;
}

/**
 * Convert a moment.duration into an es
 * compatible expression, and provide
 * associated metadata
 *
 * @param  {moment.duration} duration
 * @return {object}
 */
export function convertDurationToNormalizedEsInterval(
  duration: moment.Duration,
  targetUnit?: Unit
): EsInterval {
  for (let i = 0; i < unitsDesc.length; i++) {
    const unit = unitsDesc[i];
    const val = duration.as(unit);
    // find a unit that rounds neatly
    if (val >= 1 && Math.floor(val) === val) {
      if (val === 1 && targetUnit && unit !== targetUnit) {
        continue;
      }
      // if the unit is "large", like years, but
      // isn't set to 1 ES will puke. So keep going until
      // we get out of the "large" units
      if (i <= largeMax && val !== 1) {
        continue;
      }

      return {
        value: val,
        unit,
        expression: val + unit,
      };
    }
  }

  const ms = duration.as('ms');
  return {
    value: ms,
    unit: 'ms',
    expression: ms + 'ms',
  };
}

export function convertIntervalToEsInterval(interval: string): EsInterval {
  const { value, unit } = parseEsInterval(interval);
  return {
    value,
    unit,
    expression: interval,
  };
}
