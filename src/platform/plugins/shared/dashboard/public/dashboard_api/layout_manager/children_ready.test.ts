/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { childrenReady$ } from './children_ready';
import type { DashboardChildren, DashboardLayout } from './types';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';

const emptyLayout = {
  panels: {},
  sections: {},
};

describe('childrenReady$', () => {
  const children$ = new BehaviorSubject<DashboardChildren>({});
  const layout$ = new BehaviorSubject<DashboardLayout>(emptyLayout);

  beforeEach(() => {
    children$.next({});
    layout$.next(emptyLayout);
  });

  test('should emit true when there are no panels', (done) => {
    childrenReady$(children$, layout$).subscribe((childrenReady) => {
      expect(childrenReady).toBe(true);
      done();
    });
  });

  test('should emit true when panel apis are available', (done) => {
    children$.next({
      ['panel1']: {} as DefaultEmbeddableApi,
    });
    layout$.next({
      ...emptyLayout,
      panels: {
        ['panel1']: {
          type: 'test',
          gridData: { x: 0, y: 0, w: 6, h: 6, i: '3' },
        },
      },
    });
    childrenReady$(children$, layout$).subscribe((childrenReady) => {
      expect(childrenReady).toBe(true);
      done();
    });
  });

  test('should emit true when panels in closed sections are not available', (done) => {
    layout$.next({
      panels: {
        ['panel1']: {
          type: 'test',
          gridData: { sectionId: 'section1', x: 0, y: 0, w: 6, h: 6, i: '3' },
        },
      },
      sections: {
        ['section1']: {
          collapsed: true,
          gridData: { y: 0, i: '3' },
          title: 'Section 1',
        },
      },
    });
    childrenReady$(children$, layout$).subscribe((childrenReady) => {
      expect(childrenReady).toBe(true);
      done();
    });
  });

  test('should emit false when panel api is not available', (done) => {
    layout$.next({
      ...emptyLayout,
      panels: {
        ['panel1']: {
          type: 'test',
          gridData: { x: 0, y: 0, w: 6, h: 6, i: '3' },
        },
      },
    });
    childrenReady$(children$, layout$).subscribe((childrenReady) => {
      expect(childrenReady).toBe(false);
      done();
    });
  });
});
