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

// Monaco Editor 0.45.0+ unconditionally calls navigator.clipboard.write() and new ClipboardItem()
// These APIs don't exist in JSDOM and need to be mocked
if (!window.ClipboardItem) {
  window.ClipboardItem = class ClipboardItem {
    constructor(public data: Record<string, string | Blob | PromiseLike<string | Blob>>) {}

    public get types(): readonly string[] {
      return Object.keys(this.data);
    }

    public async getType(type: string): Promise<Blob> {
      const data = this.data[type];
      if (typeof data === 'string') {
        return new Blob([data]);
      }
      if (data instanceof Blob) {
        return data;
      }
      // It's a PromiseLike
      const resolved = await data;
      return typeof resolved === 'string' ? new Blob([resolved]) : resolved;
    }
  };
}

// navigator.clipboard mock - handles Monaco's cancelled clipboard promises
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
