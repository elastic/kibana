/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { getCategoryName } from './get_category_name';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getCategoryName(category)', function () {
      it('should capitalize unknown category', function () {
        expect(getCategoryName('elasticsearch')).to.be('Elasticsearch');
      });

      it('should return empty string for no category', function () {
        expect(getCategoryName()).to.be('');
        expect(getCategoryName('')).to.be('');
      });
    });
  });
});
