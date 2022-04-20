/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { fakeSchedulers } from 'rxjs-marbles/jest';
import ActualWatchpack from 'watchpack';

import { Bundle, ascending } from '../common';
import { watchBundlesForChanges$ } from '../optimizer/watch_bundles_for_changes';
import { BundleCacheEvent } from '../optimizer';

jest.mock('fs');
jest.mock('watchpack');

const MockWatchPack: jest.MockedClass<typeof ActualWatchpack> = jest.requireMock('watchpack');
const bundleEntryPath = (bundle: Bundle) => `${bundle.contextDir}/public/index.ts`;

const makeTestBundle = (id: string) => {
  const bundle = new Bundle({
    type: 'plugin',
    id,
    contextDir: `/repo/plugins/${id}/public`,
    publicDirNames: ['public'],
    outputDir: `/repo/plugins/${id}/target/public`,
    sourceRoot: `/repo`,
  });

  bundle.cache.set({
    cacheKey: 'abc',
    moduleCount: 1,
    optimizerCacheKey: 'abc',
    referencedPaths: [bundleEntryPath(bundle)],
  });

  return bundle;
};

const FOO_BUNDLE = makeTestBundle('foo');
const BAR_BUNDLE = makeTestBundle('bar');
const BAZ_BUNDLE = makeTestBundle('baz');
const BOX_BUNDLE = makeTestBundle('box');
const CAR_BUNDLE = makeTestBundle('car');
const BUNDLES = [FOO_BUNDLE, BAR_BUNDLE, BAZ_BUNDLE, BOX_BUNDLE, CAR_BUNDLE];

const bundleCacheEvent$ = Rx.from(BUNDLES).pipe(
  map(
    (bundle): BundleCacheEvent => ({
      type: 'bundle cached',
      bundle,
    })
  )
);

beforeEach(async () => {
  jest.useFakeTimers();
});

afterEach(async () => {
  jest.useRealTimers();
});

it(
  'notifies of changes and completes once all bundles have changed',
  fakeSchedulers(async (advance) => {
    expect.assertions(18);

    const promise = Rx.lastValueFrom(
      watchBundlesForChanges$(bundleCacheEvent$, Date.now()).pipe(
        map((event, i) => {
          // each time we trigger a change event we get a 'changed detected' event
          if (i === 0 || i === 2 || i === 4 || i === 6) {
            expect(event).toHaveProperty('type', 'changes detected');
            return;
          }

          expect(event).toHaveProperty('type', 'changes');
          // to teach TS what we're doing
          if (event.type !== 'changes') {
            return;
          }

          // first we change foo and bar, after 1 second that change comes though
          if (i === 1) {
            expect(event.bundles).toHaveLength(2);
            const [bar, foo] = event.bundles.sort(ascending((b) => b.id));
            expect(bar).toHaveProperty('id', 'bar');
            expect(foo).toHaveProperty('id', 'foo');
          }

          // next we change just the baz package and it's represented on its own
          if (i === 3) {
            expect(event.bundles).toHaveLength(1);
            expect(event.bundles[0]).toHaveProperty('id', 'baz');
          }

          // finally we change box and car together
          if (i === 5) {
            expect(event.bundles).toHaveLength(2);
            const [bar, foo] = event.bundles.sort(ascending((b) => b.id));
            expect(bar).toHaveProperty('id', 'box');
            expect(foo).toHaveProperty('id', 'car');
          }
        })
      )
    );

    expect(MockWatchPack.mock.instances).toHaveLength(1);
    const [watcher] = MockWatchPack.mock.instances as any as Array<jest.Mocked<ActualWatchpack>>;
    expect(watcher.on).toHaveBeenCalledTimes(1);
    expect(watcher.on).toHaveBeenCalledWith('change', expect.any(Function));
    const [, changeListener] = watcher.on.mock.calls[0];

    // foo and bar are changes without 1sec so they are batched
    changeListener(bundleEntryPath(FOO_BUNDLE), 'modified');
    advance(900);
    changeListener(bundleEntryPath(BAR_BUNDLE), 'modified');
    advance(1000);

    // baz is the only change in 1sec so it is on its own
    changeListener(bundleEntryPath(BAZ_BUNDLE), 'modified');
    advance(1000);

    // finish by changing box and car
    changeListener(bundleEntryPath(BOX_BUNDLE), 'deleted');
    changeListener(bundleEntryPath(CAR_BUNDLE), 'deleted');
    advance(1000);

    await expect(promise).resolves.toEqual(undefined);
  })
);
