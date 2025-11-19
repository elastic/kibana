/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import '@testing-library/jest-dom';

// Mock navigator.clipboard for Monaco Editor 0.45.0+
// Monaco's clipboard service cancels DeferredPromises which causes unhandled rejections in tests
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
    write: jest.fn((items?: ClipboardItem[]) => {
      // Catch promise rejections from Monaco's DeferredPromise cancellations
      items?.forEach((item: any) => {
        Object.values(item.data || {}).forEach((value: any) => {
          value?.catch?.(() => {}); // Ignore cancellation errors
        });
      });
      return Promise.resolve();
    }),
    read: jest.fn().mockResolvedValue([]),
  },
  configurable: true,
});
