/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

export const getValueBy = (fn, data) => {
  if (_.isNumber(data)) return data;
  if (!Array.isArray(data)) return 0;
  const values = data.map((v) => v[1]);
  return _[fn](values);
};
