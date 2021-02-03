/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BaseParamType } from './base';
import { OptionedParamType } from './optioned';

describe('Optioned', () => {
  describe('constructor', () => {
    it('it is an instance of BaseParamType', () => {
      const aggParam = new OptionedParamType({
        name: 'some_param',
        type: 'optioned',
      });

      expect(aggParam instanceof BaseParamType).toBeTruthy();
    });
  });
});
