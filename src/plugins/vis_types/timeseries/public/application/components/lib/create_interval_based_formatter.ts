/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

const JANUARY_MOMENT_CONFIG = { M: 0, d: 1 };

function getFormat(interval: number, rules: string[][] = []) {
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (!rule[0] || interval >= Number(moment.duration(rule[0]))) {
      return rule[1];
    }
  }
}

export function createIntervalBasedFormatter(
  interval: number,
  rules: string[][],
  dateFormat: string,
  ignoreDaylightTime: boolean
) {
  const fixedOffset = moment(JANUARY_MOMENT_CONFIG).utcOffset();
  return (val: moment.MomentInput) => {
    const momentVal = moment(val);
    if (ignoreDaylightTime) {
      momentVal.utcOffset(fixedOffset);
    }
    return momentVal.format(getFormat(interval, rules) ?? dateFormat);
  };
}
