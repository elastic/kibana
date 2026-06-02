/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import type { CoreStart } from '@kbn/core/public';
import { registerNewsfeedHandler } from './register_newsfeed_handler';
import type { NewsfeedApi } from './lib/api';
import type { FetchResult } from './types';

const createFetchResult = (): FetchResult => ({
  kibanaVersion: '9.5.0',
  hasNew: true,
  feedItems: [
    {
      title: 'Test news item',
      description: 'A test news description',
      linkText: 'Read more',
      linkUrl: 'https://elastic.co/blog/test',
      badge: null,
      publishOn: moment('2026-01-01'),
      expireOn: moment('2027-01-01'),
      hash: 'test-hash-1',
    },
  ],
  error: null,
});

describe('registerNewsfeedHandler', () => {
  it('registers a chrome newsfeed handler and returns its cleanup callback', () => {
    const unregister = jest.fn();
    const registerNewsfeedHandlerMock = jest.fn().mockReturnValue(unregister);
    const openSystemFlyout = jest.fn().mockReturnValue({ close: jest.fn() });
    const fetchResults$ = new BehaviorSubject<FetchResult | null | void>(createFetchResult());
    const markAsRead = jest.fn();
    const api: NewsfeedApi = { fetchResults$, markAsRead };
    const core = {
      chrome: {
        next: {
          registerNewsfeedHandler: registerNewsfeedHandlerMock,
        },
      },
      overlays: {
        openSystemFlyout,
      },
    } as unknown as CoreStart;

    const cleanup = registerNewsfeedHandler({ core, api, isServerless: false });

    expect(cleanup).toBe(unregister);
    expect(registerNewsfeedHandlerMock).toHaveBeenCalledTimes(1);

    const [{ open, hasNew$ }] = registerNewsfeedHandlerMock.mock.calls[0];
    const hasNewValues: boolean[] = [];
    const subscription = hasNew$.subscribe((hasNew: boolean) => hasNewValues.push(hasNew));

    expect(hasNewValues).toEqual([true]);

    open();

    expect(markAsRead).toHaveBeenCalledWith(['test-hash-1']);
    expect(openSystemFlyout).toHaveBeenCalledWith(expect.anything(), { size: 's' });

    subscription.unsubscribe();
  });
});
