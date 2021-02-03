/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

function getFormat(interval, rules = []) {
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (!rule[0] || interval >= moment.duration(rule[0])) {
      return rule[1];
    }
  }
}

export function createXaxisFormatter(interval, rules, dateFormat) {
  return (val) => {
    return moment(val).format(getFormat(interval, rules) ?? dateFormat);
  };
}
