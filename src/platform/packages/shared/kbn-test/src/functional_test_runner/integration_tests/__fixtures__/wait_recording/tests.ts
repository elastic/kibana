/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as delay } from 'timers/promises';
import type { GenericFtrProviderContext } from '../../../../..';

const tests = ({ getService }: GenericFtrProviderContext<{}, {}>): void => {
  const lifecycle = getService('lifecycle');
  describe('wait recording integration', () => {
    before(async () => {
      await lifecycle.recordWait('sleep', 'shared setup', () => delay(5));
    });
    beforeEach(async () => {
      await lifecycle.recordWait('sleep', 'beforeEach', () => delay(5));
    });
    afterEach(async () => {
      await lifecycle.recordWait('sleep', 'afterEach', () => delay(5));
    });
    it('first test', async () => {
      await lifecycle.recordWait('sleep', 'first test sleep', () => delay(5));
    });
    it('runtime-skipped test', async function () {
      await lifecycle.recordWait('sleep', 'runtime-skipped test sleep', () => delay(11));
      this.skip();
    });
    it('declared pending test');
    it('second test', async () => {
      await lifecycle.recordWait('sleep', 'second test sleep', () => delay(5));
    });
  });
};

export = tests;
