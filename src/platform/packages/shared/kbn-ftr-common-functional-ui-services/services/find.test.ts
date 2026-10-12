/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebDriver } from 'selenium-webdriver';
import type { FtrProviderContext } from './ftr_provider_context';
import { FindService } from './find';
import { Browsers } from './remote/browsers';

describe('FindService existence checks', () => {
  let wait: jest.Mock;
  let setTimeouts: jest.Mock;

  const getFindService = () => {
    const config = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'timeouts.waitForExists':
            return 1500;
          case 'timeouts.find':
            return 10000;
          case 'layout.fixedHeaderHeight':
            return 0;
          default:
            throw new Error(`Unexpected config key: ${key}`);
        }
      }),
    };
    const services = {
      config,
      log: { debug: jest.fn() },
      retry: {},
      retryOnStale: {},
    };
    const ctx = {
      getService: (name: keyof typeof services) => services[name],
    } as unknown as FtrProviderContext;
    const driver = {
      manage: () => ({ setTimeouts }),
      wait,
    } as unknown as WebDriver;

    return new FindService(ctx, Browsers.Chrome, driver);
  };

  beforeEach(() => {
    wait = jest.fn().mockRejectedValue(new Error('element not found'));
    setTimeouts = jest.fn().mockResolvedValue(undefined);
  });

  it('uses a bounded Selenium wait for a zero-timeout displayed check', async () => {
    const find = getFindService();

    await expect(find.existsByDisplayedByCssSelector('.selector', 0)).resolves.toBe(false);

    expect(wait).toHaveBeenCalledWith(expect.any(Function), 1);
  });

  it('uses a bounded Selenium wait for a zero-timeout hidden-allowed check', async () => {
    const find = getFindService();

    await expect(find.existsByCssSelector('.selector', 0)).resolves.toBe(false);

    expect(wait).toHaveBeenCalledWith(expect.any(Function), 1);
  });
});
