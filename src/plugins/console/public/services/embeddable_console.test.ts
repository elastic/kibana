/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableConsoleInfo } from './embeddable_console';

describe('EmbeddableConsoleInfo', () => {
  let eConsole: EmbeddableConsoleInfo;
  beforeEach(() => {
    eConsole = new EmbeddableConsoleInfo();
  });
  describe('isEmbeddedConsoleAvailable', () => {
    it('returns true if dispatch has been set', () => {
      eConsole.setDispatch(jest.fn());
      expect(eConsole.isEmbeddedConsoleAvailable()).toBe(true);
    });
    it('returns false if dispatch has not been set', () => {
      expect(eConsole.isEmbeddedConsoleAvailable()).toBe(false);
    });
    it('returns false if dispatch has been cleared', () => {
      eConsole.setDispatch(jest.fn());
      eConsole.setDispatch(null);
      expect(eConsole.isEmbeddedConsoleAvailable()).toBe(false);
    });
  });
  describe('openEmbeddedConsole', () => {
    const mockDispatch = jest.fn();
    beforeEach(() => {
      jest.clearAllMocks();

      eConsole.setDispatch(mockDispatch);
    });
    it('dispatches open action', () => {
      eConsole.openEmbeddedConsole();

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'open' });
    });
    it('can set content', () => {
      eConsole.openEmbeddedConsole('GET /_cat/_indices');

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'open',
        payload: { content: 'GET /_cat/_indices' },
      });
    });
  });
});
