/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function ({ getService, loadTestFile }) {
  const remote = getService('remote');

  describe('suite3', () => {
    before(async () => {
      process.send({
        name: 'before suite3',
        size: await remote.getWindowSize(),
      });

      await remote.setWindowSize(800, 800);
    });

    it('has the right window size', async () => {
      process.send({
        name: 'in suite3',
        size: await remote.getWindowSize(),
      });
    });

    loadTestFile(require.resolve('./test3.1'));

    after(async () => {
      process.send({
        name: 'after suite3',
        size: await remote.getWindowSize(),
      });
    });
  });
}
