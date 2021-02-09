/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isArray, last } from 'lodash';

const DEFAULT_VALUE = null;
const extractValue = (data) => (data && data[1]) || null;

export const getLastValue = (data, defaultValue = DEFAULT_VALUE) => {
  if (!isArray(data)) {
    return data || defaultValue;
  }

  return extractValue(last(data)) || defaultValue;
};
