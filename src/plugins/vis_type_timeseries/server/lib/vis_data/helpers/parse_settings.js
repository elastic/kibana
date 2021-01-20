/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const numericKeys = ['alpha', 'beta', 'gamma', 'period'];
const booleanKeys = ['pad'];
function castBasedOnKey(key, val) {
  if (~numericKeys.indexOf(key)) return Number(val);
  if (~booleanKeys.indexOf(key)) {
    switch (val) {
      case 'true':
      case 1:
      case '1':
        return true;
      default:
        return false;
    }
  }
  return val;
}
export const parseSettings = (settingsStr) => {
  return settingsStr.split(/\s/).reduce((acc, value) => {
    const [key, val] = value.split(/=/);
    acc[key] = castBasedOnKey(key, val);
    return acc;
  }, {});
};
