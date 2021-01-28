/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { inspectorPluginMock } from '../mocks';

describe('inspector', () => {
  describe('open()', () => {
    it('should throw an error if no views available', async () => {
      const { doStart } = await inspectorPluginMock.createPlugin();
      const start = await doStart();
      expect(() => start.open({})).toThrow();
    });
  });
});
