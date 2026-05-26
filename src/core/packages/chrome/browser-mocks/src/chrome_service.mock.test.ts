/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { take, toArray } from 'rxjs';
import { chromeServiceMock } from './chrome_service.mock';

describe('chromeServiceMock app header state', () => {
  it('ignores stale app header unregister callbacks', async () => {
    const chrome = chromeServiceMock.createStartContract();
    const values = firstValueFrom(chrome.next.appHeader.get$().pipe(take(4), toArray()));

    const unregisterFirst = chrome.next.appHeader.set({ title: 'First' });
    chrome.next.appHeader.set({ title: 'Second' });
    unregisterFirst();
    const unregisterSecond = chrome.next.appHeader.set({ title: 'Third' });
    unregisterSecond();

    await expect(values).resolves.toEqual([
      undefined,
      { title: 'First' },
      { title: 'Second' },
      { title: 'Third' },
    ]);
  });

  it('updates inline app header state when set', async () => {
    const chrome = chromeServiceMock.createStartContract();
    const values = firstValueFrom(chrome.next.inlineAppHeader.get$().pipe(take(3), toArray()));

    chrome.next.inlineAppHeader.set(true);
    chrome.next.inlineAppHeader.set(false);

    await expect(values).resolves.toEqual([false, true, false]);
  });
});
