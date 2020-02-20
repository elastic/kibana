/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('fs');

import { Bundle } from '../common';

import { assignBundlesToWorkers, Assignments } from './assign_bundles_to_workers';

const hasModuleCount = (b: Bundle) => b.cache.getModuleCount() !== undefined;
const noModuleCount = (b: Bundle) => b.cache.getModuleCount() === undefined;
const summarizeBundles = (w: Assignments) =>
  [
    w.moduleCount ? `${w.moduleCount} known modules` : '',
    w.newBundles ? `${w.newBundles} new bundles` : '',
  ]
    .filter(Boolean)
    .join(', ');

const readConfigs = (workers: Assignments[]) =>
  workers.map(
    (w, i) => `worker ${i} (${summarizeBundles(w)}) => ${w.bundles.map(b => b.id).join(',')}`
  );

const assertReturnVal = (workers: Assignments[]) => {
  expect(workers).toBeInstanceOf(Array);
  for (const worker of workers) {
    expect(worker).toEqual({
      moduleCount: expect.any(Number),
      newBundles: expect.any(Number),
      bundles: expect.any(Array),
    });

    expect(worker.bundles.filter(noModuleCount).length).toBe(worker.newBundles);
    expect(
      worker.bundles.filter(hasModuleCount).reduce((sum, b) => sum + b.cache.getModuleCount()!, 0)
    ).toBe(worker.moduleCount);
  }
};

const testBundle = (id: string) =>
  new Bundle({
    contextDir: `/repo/plugin/${id}/public`,
    entry: 'index.ts',
    id,
    outputDir: `/repo/plugins/${id}/target/public`,
    sourceRoot: `/repo`,
    type: 'plugin',
  });

const getBundles = ({
  withCounts = 0,
  withoutCounts = 0,
}: {
  withCounts?: number;
  withoutCounts?: number;
}) => {
  const bundles: Bundle[] = [];

  for (let i = 1; i <= withCounts; i++) {
    const id = `foo${i}`;
    const bundle = testBundle(id);
    bundle.cache.set({ moduleCount: i % 5 === 0 ? i * 10 : i });
    bundles.push(bundle);
  }

  for (let i = 0; i < withoutCounts; i++) {
    const id = `bar${i}`;
    bundles.push(testBundle(id));
  }

  return bundles;
};

it('creates less workers if maxWorkersCount is larger than bundle count', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 2 }), 10);

  assertReturnVal(workers);
  expect(workers.length).toBe(2);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (1 known modules) => foo1",
      "worker 1 (2 known modules) => foo2",
    ]
  `);
});

it('assigns unknown plugin counts as evenly as possible', () => {
  const workers = assignBundlesToWorkers(getBundles({ withoutCounts: 10 }), 3);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (4 new bundles) => bar9,bar6,bar3,bar0",
      "worker 1 (3 new bundles) => bar8,bar5,bar2",
      "worker 2 (3 new bundles) => bar7,bar4,bar1",
    ]
  `);
});

it('distributes bundles without module counts evenly after assigning modules with known counts evenly', () => {
  const bundles = getBundles({ withCounts: 16, withoutCounts: 10 });
  const workers = assignBundlesToWorkers(bundles, 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (78 known modules, 3 new bundles) => foo5,foo11,foo8,foo6,foo2,foo1,bar9,bar5,bar1",
      "worker 1 (78 known modules, 3 new bundles) => foo16,foo14,foo13,foo12,foo9,foo7,foo4,foo3,bar8,bar4,bar0",
      "worker 2 (100 known modules, 2 new bundles) => foo10,bar7,bar3",
      "worker 3 (150 known modules, 2 new bundles) => foo15,bar6,bar2",
    ]
  `);
});

it('distributes 2 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 2 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (1 known modules) => foo1",
      "worker 1 (2 known modules) => foo2",
    ]
  `);
});

it('distributes 5 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 5 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (3 known modules) => foo2,foo1",
      "worker 1 (3 known modules) => foo3",
      "worker 2 (4 known modules) => foo4",
      "worker 3 (50 known modules) => foo5",
    ]
  `);
});

it('distributes 10 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 10 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (20 known modules) => foo9,foo6,foo4,foo1",
      "worker 1 (20 known modules) => foo8,foo7,foo3,foo2",
      "worker 2 (50 known modules) => foo5",
      "worker 3 (100 known modules) => foo10",
    ]
  `);
});

it('distributes 15 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 15 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (70 known modules) => foo14,foo13,foo12,foo11,foo9,foo6,foo4,foo1",
      "worker 1 (70 known modules) => foo5,foo8,foo7,foo3,foo2",
      "worker 2 (100 known modules) => foo10",
      "worker 3 (150 known modules) => foo15",
    ]
  `);
});

it('distributes 20 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 20 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (153 known modules) => foo15,foo3",
      "worker 1 (153 known modules) => foo10,foo16,foo13,foo11,foo7,foo6",
      "worker 2 (154 known modules) => foo5,foo19,foo18,foo17,foo14,foo12,foo9,foo8,foo4,foo2,foo1",
      "worker 3 (200 known modules) => foo20",
    ]
  `);
});

it('distributes 25 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 25 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (250 known modules) => foo20,foo17,foo13,foo9,foo8,foo2,foo1",
      "worker 1 (250 known modules) => foo15,foo23,foo22,foo18,foo16,foo11,foo7,foo3",
      "worker 2 (250 known modules) => foo10,foo5,foo24,foo21,foo19,foo14,foo12,foo6,foo4",
      "worker 3 (250 known modules) => foo25",
    ]
  `);
});

it('distributes 30 bundles to workers evenly', () => {
  const workers = assignBundlesToWorkers(getBundles({ withCounts: 30 }), 4);

  assertReturnVal(workers);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (352 known modules) => foo30,foo22,foo14,foo11,foo4,foo1",
      "worker 1 (352 known modules) => foo15,foo10,foo28,foo24,foo19,foo16,foo9,foo6",
      "worker 2 (353 known modules) => foo20,foo5,foo29,foo23,foo21,foo13,foo12,foo3,foo2",
      "worker 3 (353 known modules) => foo25,foo27,foo26,foo18,foo17,foo8,foo7",
    ]
  `);
});
