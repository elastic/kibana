/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function () {
  describe('ordinary failure suite', () => {
    it('$ORDINARY_FAILING_TEST$', () => {
      throw new Error('$ORDINARY_FAILING_TEST_ERROR$');
    });

    it('$SHOULD_STILL_RUN$', () => {
      console.log('$SHOULD_STILL_RUN_RAN$');
    });
  });
}
