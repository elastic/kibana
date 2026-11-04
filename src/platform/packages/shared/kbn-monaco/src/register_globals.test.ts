/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./languages/worker_factory', () => ({
  getWorker: jest.fn(),
}));

describe('monaco globals', () => {
  beforeAll(async () => {
    await import('./register_globals');
  });

  describe('registers accompanying objects on window.MonacoEnvironment for kibana', () => {
    it('defines the monaco object on the MonacoEnvironment object', () => {
      expect(window.MonacoEnvironment).toHaveProperty('monaco');
    });

    it('defines the getWorker method on the MonacoEnvironment object', () => {
      expect(window.MonacoEnvironment).toHaveProperty('getWorker', expect.any(Function));
    });
  });
});
