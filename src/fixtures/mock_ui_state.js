/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';
let values = {};
export default {
  get: function (path, def) {
    return _.get(values, path, def);
  },
  set: function (path, val) {
    set(values, path, val);
    return val;
  },
  setSilent: function (path, val) {
    set(values, path, val);
    return val;
  },
  emit: _.noop,
  on: _.noop,
  off: _.noop,
  clearAllKeys: function () {
    values = {};
  },
  _reset: function () {
    values = {};
  },
};
