/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { setFormatService } from '../services';

setFormatService({
  deserialize: () => ({
    convert: (v) => v,
  }),
});

export const getMockUiState = () => {
  const map = new Map();

  return (() => ({
    get: (...args) => map.get(...args),
    set: (...args) => map.set(...args),
    setSilent: (...args) => map.set(...args),
    on: () => undefined,
  }))();
};
