/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isValidContext } from './helpers';

describe('tracking', () => {
  describe('isValidLocation', () => {
    it('identifies correct contexts', () => {
      expect(
        isValidContext({
          feature: 'test',
          source: 'security::test',
        })
      ).toBeTruthy();
    });

    it('identifies incorrect contexts', () => {
      expect(
        isValidContext({
          feature: '',
          source: 'security::',
        })
      ).toBeFalsy();

      expect(
        isValidContext({
          feature: 'test',
          source: 'security::',
        })
      ).toBeFalsy();

      expect(
        isValidContext({
          feature: '',
          source: 'security::test',
        })
      ).toBeFalsy();
    });
  });
});
