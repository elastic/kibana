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
import { sidebarServiceMock } from '@kbn/core-chrome-sidebar-mocks';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult, NewsfeedItem } from '../types';
import { createNewsfeedSidebarController } from './controller';

const createMockItem = (hash: string): NewsfeedItem => ({
  title: 'Test news item',
  description: 'A test news description',
  linkText: 'Read more',
  linkUrl: 'https://elastic.co/blog/test',
  badge: null,
  publishOn: moment('2026-01-01'),
  expireOn: moment('2027-01-01'),
  hash,
});

const createFetchResult = (): FetchResult => ({
  kibanaVersion: '9.5.0',
  hasNew: true,
  feedItems: [createMockItem('test-hash-1'), createMockItem('test-hash-2')],
  error: null,
});

const setup = (fetchResult: FetchResult | null = createFetchResult()) => {
  const fetchResults$ = new BehaviorSubject<FetchResult | void | null>(fetchResult);
  const markAsRead = jest.fn();
  const newsfeedApi: NewsfeedApi = { fetchResults$, markAsRead };

  const isOpen$ = new BehaviorSubject(false);
  const app = sidebarServiceMock.createAppMock();
  app.isOpen$.mockReturnValue(isOpen$);
  app.isOpen.mockImplementation(() => isOpen$.getValue());
  const sidebar = sidebarServiceMock.createStartContract();
  sidebar.getApp.mockReturnValue(app);

  const controller = createNewsfeedSidebarController({ sidebar, newsfeedApi });

  return {
    controller,
    markAsRead,
    fetchResults$,
    isOpen$,
    open: app.open,
    close: app.close,
  };
};

describe('createNewsfeedSidebarController', () => {
  test('open() marks the current items as read and shows the panel', () => {
    const { controller, markAsRead, open } = setup();

    controller.open();

    expect(markAsRead).toHaveBeenCalledWith(['test-hash-1', 'test-hash-2']);
    expect(open).toHaveBeenCalledTimes(1);
  });

  test('open() marks the latest items as read, not a stale result', () => {
    const { controller, markAsRead, fetchResults$ } = setup();

    fetchResults$.next({ ...createFetchResult(), feedItems: [createMockItem('later-hash')] });
    controller.open();

    expect(markAsRead).toHaveBeenCalledWith(['later-hash']);
  });

  test('open() shows the panel even before any results arrive', () => {
    const { controller, markAsRead, open } = setup(null);

    controller.open();

    expect(markAsRead).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
  });

  test('toggle() opens the app and marks items as read when closed', () => {
    const { controller, markAsRead, open } = setup();
    controller.toggle();

    expect(markAsRead).toHaveBeenCalledWith(['test-hash-1', 'test-hash-2']);
    expect(open).toHaveBeenCalledTimes(1);
  });

  test('toggle() closes the app when open', () => {
    const { controller, isOpen$, markAsRead, close } = setup();
    isOpen$.next(true);

    controller.toggle();

    expect(close).toHaveBeenCalledTimes(1);
    expect(markAsRead).not.toHaveBeenCalled();
  });

  test('isOpen$ tracks whether the newsfeed is the current app', () => {
    const { controller, isOpen$ } = setup();
    const emitted: boolean[] = [];
    const sub = controller.isOpen$.subscribe((isOpen) => emitted.push(isOpen));

    isOpen$.next(true);
    isOpen$.next(false);

    expect(emitted).toEqual([false, true, false]);
    sub.unsubscribe();
  });
});
