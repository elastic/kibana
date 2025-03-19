/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import configFile from '../timelion.json';

export default function () {
  function flattenWith(dot, nestedObj, flattenArrays) {
    const stack = []; // track key stack
    const flatObj = {};
    (function flattenObj(obj) {
      _.keys(obj).forEach(function (key) {
        stack.push(key);
        if (!flattenArrays && Array.isArray(obj[key])) flatObj[stack.join(dot)] = obj[key];
        else if (_.isObject(obj[key])) flattenObj(obj[key]);
        else flatObj[stack.join(dot)] = obj[key];
        stack.pop();
      });
    })(nestedObj);
    return flatObj;
  }

  const timelionDefaults = flattenWith('.', configFile);
  return _.reduce(
    timelionDefaults,
    (result, value, key) => {
      result['timelion:' + key] = value;
      return result;
    },
    {}
  );
}
