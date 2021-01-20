/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

export default () => {
  describe('app one', () => {
    before(() => {
      console.log('$BEFORE$');
    });

    it('$TESTNAME$', () => {
      expect(1).to.be(1);
      console.log('$INTEST$');
    });

    after(() => {
      console.log('$AFTER$');
    });
  });
};
