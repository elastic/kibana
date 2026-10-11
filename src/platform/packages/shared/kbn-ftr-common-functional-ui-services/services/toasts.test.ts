/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { error, Session, WebDriver } from 'selenium-webdriver';
import type { Command } from 'selenium-webdriver/lib/command';
import { ToolingLog } from '@kbn/tooling-log';
import { FindService } from './find';
import { Browsers } from './remote/browsers';
import { ToastsService } from './toasts';

describe('ToastsService empty snapshots', () => {
  it('keeps a bounded root lookup when requesting a zero-timeout child snapshot', async () => {
    let rootReads = 0;
    const execute = jest.fn(async (_command: Command) => {
      if (rootReads++ > 0) throw new Error('Root lookup has no deadline');
      await new Promise((resolve) => setTimeout(resolve, 5));
      return [];
    });
    const driver = new WebDriver(Promise.resolve(new Session('ftr', {})), { execute });
    const find = {
      driver,
      log: new ToolingLog(),
      defaultFindTimeout: 1,
      fixedHeaderHeight: 0,
      browserType: Browsers.Chrome,
      findAndWrap: FindService.prototype['findAndWrap'],
      wrap: FindService.prototype['wrap'],
    };
    const toasts = {
      getGlobalList: ToastsService.prototype['getGlobalList'],
      testSubjects: {
        find: (selector: string, timeout?: number) =>
          FindService.prototype.byCssSelector.call(find, `[data-test-subj="${selector}"]`, timeout),
      },
    };
    await expect(
      ToastsService.prototype.getAll.call(toasts, { timeout: 0 })
    ).rejects.toBeInstanceOf(error.TimeoutError);
    expect(rootReads).toBe(1);
  });
});
