/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { usePreviewScreenshot } from './use_preview_screenshot';
import { takePreviewScreenshot } from './take_screenshot';

jest.mock('./take_screenshot', () => ({
  takePreviewScreenshot: jest.fn(),
}));

describe('usePreviewScreenshot', () => {
  const props = {
    savedObjectId: 'some-id',
    lastUpdatedAt: new Date().toISOString(),
    http: {} as any,
    notifications: {} as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a function that does nothing if savedObjectId is not provided', () => {
    const { result } = renderHook(() =>
      usePreviewScreenshot({ ...props, savedObjectId: undefined })
    );
    const screenshotFn = result.current;
    expect(screenshotFn()).resolves.toBe(false);
    expect(takePreviewScreenshot).not.toHaveBeenCalled();
  });

  it('should return a function that does nothing if container is not found', () => {
    const { result } = renderHook(() => usePreviewScreenshot(props));
    const screenshotFn = result.current;
    expect(screenshotFn()).resolves.toBe(false);
    expect(takePreviewScreenshot).not.toHaveBeenCalled();
  });

  it('should call takePreviewScreenshot when container is found', () => {
    const container = document.createElement('div');
    container.classList.add('test-container');
    document.body.appendChild(container);

    const { result } = renderHook(() =>
      usePreviewScreenshot({ ...props, querySelector: '.test-container' })
    );
    const screenshotFn = result.current;
    screenshotFn();

    expect(takePreviewScreenshot).toHaveBeenCalledWith({
      ...props,
      querySelector: '.test-container',
    });

    document.body.removeChild(container);
  });
});
