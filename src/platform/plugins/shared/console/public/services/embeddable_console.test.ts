/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StorageMock } from './storage.mock';
import { EmbeddableConsoleInfo } from './embeddable_console';

describe('EmbeddableConsoleInfo', () => {
  jest.useFakeTimers();

  let eConsole: EmbeddableConsoleInfo;
  let storage: StorageMock;
  beforeEach(() => {
    storage = new StorageMock({} as unknown as Storage, 'test');
    eConsole = new EmbeddableConsoleInfo(storage);
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
    it('does nothing if dispatch not set', () => {
      eConsole.setDispatch(null);

      eConsole.openEmbeddedConsole();

      expect(mockDispatch).toHaveBeenCalledTimes(0);
    });
  });
  describe('openEmbeddedConsoleAlternateView', () => {
    const mockDispatch = jest.fn();
    beforeEach(() => {
      jest.clearAllMocks();

      eConsole.setDispatch(mockDispatch);
    });
    it('dispatches open when alt view does not exist', () => {
      eConsole.openEmbeddedConsoleAlternateView();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'open',
        payload: { alternateView: false },
      });
    });
    it('dispatches open alt view when alt view exists', () => {
      eConsole.registerAlternateView({
        ActivationButton: jest.fn(),
        ViewContent: jest.fn(),
      });

      eConsole.openEmbeddedConsoleAlternateView();
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'open',
        payload: { alternateView: true },
      });
    });
    it('does nothing if dispatch not set', () => {
      eConsole.setDispatch(null);

      eConsole.openEmbeddedConsoleAlternateView();

      expect(mockDispatch).toHaveBeenCalledTimes(0);
    });
  });
  describe('getConsoleHeight', () => {
    it('returns value in storage when found', () => {
      storage.get.mockReturnValue('201');
      expect(eConsole.getConsoleHeight()).toEqual('201');
      expect(storage.get).toHaveBeenCalledWith('embeddedConsoleHeight', undefined);
    });
    it('returns undefined when not found', () => {
      storage.get.mockReturnValue(undefined);
      expect(eConsole.getConsoleHeight()).toEqual(undefined);
    });
  });
  describe('setConsoleHeight', () => {
    it('stores value in storage', () => {
      // setConsoleHeight calls are debounced
      eConsole.setConsoleHeight('120');
      eConsole.setConsoleHeight('110');
      eConsole.setConsoleHeight('100');

      jest.runAllTimers();

      expect(storage.set).toHaveBeenCalledTimes(1);
      expect(storage.set).toHaveBeenCalledWith('embeddedConsoleHeight', '100');
    });
  });
});
