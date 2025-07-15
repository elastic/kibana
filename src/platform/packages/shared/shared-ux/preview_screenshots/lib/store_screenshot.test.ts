/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storePreviewScreenshot } from './store_screenshot';
import { getStorageKey } from './get_storage_key';

describe('storePreviewScreenshot', () => {
  const savedObjectId = 'test-id';
  const dataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const key = getStorageKey(savedObjectId);

  beforeEach(() => {
    sessionStorage.clear();
    jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);
    // Mock console.error to avoid logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should store the data URL and timestamp in sessionStorage', () => {
    const result = storePreviewScreenshot({ savedObjectId, dataUrl });

    expect(result).toBe(true);
    const storedItem = sessionStorage.getItem(key);
    expect(storedItem).not.toBeNull();
    const parsedItem = JSON.parse(storedItem!);
    expect(parsedItem).toEqual({
      image: dataUrl,
      timestamp: 1234567890,
    });
  });

  it('should update an existing entry in sessionStorage', () => {
    const oldData = {
      image: 'old-data-url',
      timestamp: 1234500000,
    };
    sessionStorage.setItem(key, JSON.stringify(oldData));

    const result = storePreviewScreenshot({ savedObjectId, dataUrl });

    expect(result).toBe(true);
    const storedItem = sessionStorage.getItem(key);
    const parsedItem = JSON.parse(storedItem!);
    expect(parsedItem).toEqual({
      image: dataUrl,
      timestamp: 1234567890,
    });
  });

  describe('when sessionStorage.setItem throws an error', () => {
    beforeEach(() => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
    });

    it('should return false and log an error', () => {
      const result = storePreviewScreenshot({ savedObjectId, dataUrl });

      expect(result).toBe(false);
      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalled();
    });

    it('should remove an existing invalid item from storage', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid-json');
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

      storePreviewScreenshot({ savedObjectId, dataUrl });

      expect(removeItemSpy).toHaveBeenCalledWith(key);
    });

    it('should not remove an existing valid item from storage', () => {
      const validData = { image: 'valid-image', timestamp: 123 };
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(validData));
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

      storePreviewScreenshot({ savedObjectId, dataUrl });

      expect(removeItemSpy).not.toHaveBeenCalled();
    });
  });
});
