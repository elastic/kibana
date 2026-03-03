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
// Monaco's Safari workaround cancels internal DeferredPromises, causing unhandled rejections in tests
Object.defineProperty(navigator, 'clipboard', {
  value: {
    write: jest.fn((items?: ClipboardItem[]) => {
      // Handle cancelled promises to prevent unhandled rejections
      items?.forEach((item: any) => {
        if (item?.data) {
          Object.values(item.data).forEach((value: any) => {
            if (value?.catch) {
              value.catch((error: any) => {
                // Only suppress expected cancellations; let real errors fail tests
                if (error?.message !== 'Canceled' && error?.name !== 'Canceled') {
                  throw error;
                }
              });
            }
          });
        }
      });
      return Promise.resolve();
    }),
  },
  configurable: true,
});
