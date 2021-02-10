/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MODEL_TYPES } from './model_options';

describe('src/legacy/core_plugins/metrics/common/model_options.js', () => {
  describe('MODEL_TYPES', () => {
    test('should match a snapshot of constants', () => {
      expect(MODEL_TYPES).toMatchSnapshot();
    });
  });
});
