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

import { getBundleDefinitions } from './get_bundle_definitions';
import { OptimizerCache } from './optimizer_cache';
import { assignBundlesToWorkers, Worker, Options } from './assign_bundles_to_workers';
import { BundleDefinition } from './common';

const REPO = '/repo';
const BIG_BUNDLES = 'dqv'.split('');
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const pluginsWithCounts = (n: number) =>
  ALPHABET.slice(0, n).map(id => ({
    directory: `/repo/plugins/${id}`,
    id,
    isUiPlugin: true,
  }));

const pluginsWithoutCounts = (n: number) =>
  ' '
    .repeat(n)
    .split('')
    .map((_, i) => `foo${i + 1}`)
    .map(id => ({
      directory: `/repo/plugins/${id}`,
      id,
      isUiPlugin: true,
    }));

const cache = new OptimizerCache(false);
jest
  .spyOn(cache, 'getBundleModuleCount')
  .mockImplementation(id =>
    ALPHABET.includes(id)
      ? (ALPHABET.indexOf(id) + 1) * (BIG_BUNDLES.includes(id) ? 10 : 1)
      : undefined
  );

const moduleCount = (b: BundleDefinition) => cache.getBundleModuleCount(b.id);
const hasModuleCount = (b: BundleDefinition) => moduleCount(b) !== undefined;
const noModuleCount = (b: BundleDefinition) => moduleCount(b) === undefined;
const summarizeBundles = (w: Worker) =>
  [
    w.moduleCount ? `${w.moduleCount} known modules` : '',
    w.newBundles ? `${w.newBundles} new bundles` : '',
  ]
    .filter(Boolean)
    .join(', ');

const readConfigs = (workers: Worker[]) =>
  workers.map(
    (w, i) => `worker ${i} (${summarizeBundles(w)}) => ${w.config.bundles.map(b => b.id).join(',')}`
  );

const assertReturnVal = (workers: Worker[]) => {
  expect(workers).toBeInstanceOf(Array);
  for (const worker of workers) {
    expect(worker).toEqual({
      moduleCount: expect.any(Number),
      newBundles: expect.any(Number),
      config: {
        repoRoot: REPO,
        watch: expect.any(Boolean),
        dist: expect.any(Boolean),
        profileWebpack: expect.any(Boolean),
        bundles: expect.any(Array),
      },
    });

    expect(worker.config.bundles.filter(noModuleCount).length).toBe(worker.newBundles);
    expect(
      worker.config.bundles.filter(hasModuleCount).reduce((sum, b) => sum + moduleCount(b)!, 0)
    ).toBe(worker.moduleCount);
  }
};

const defaultOptions: Omit<Options, 'bundles'> = {
  maxWorkerCount: 4,
  watch: false,
  dist: false,
  cache,
  repoRoot: REPO,
  profileWebpack: false,
};

it('creates less workers if maxWorkersCount is larger than bundle count', () => {
  const workers = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(2), REPO),
    maxWorkerCount: 10,
  });

  assertReturnVal(workers);
  expect(workers.length).toBe(2);
  expect(readConfigs(workers)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (1 known modules) => a",
      "worker 1 (2 known modules) => b",
    ]
  `);
});

it('assigns unknown plugin counts as evenly as possible', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithoutCounts(10), REPO),
    maxWorkerCount: 3,
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (4 new bundles) => foo9,foo6,foo3,foo1",
      "worker 1 (3 new bundles) => foo8,foo5,foo2",
      "worker 2 (3 new bundles) => foo7,foo4,foo10",
    ]
  `);
});

it('distributes bundles without module counts evenly after assigning modules with known counts evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions([...pluginsWithCounts(16), ...pluginsWithoutCounts(10)], REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (42 known modules, 3 new bundles) => n,m,h,g,foo9,foo5,foo10",
      "worker 1 (43 known modules, 3 new bundles) => o,l,i,f,a,foo8,foo4,foo1",
      "worker 2 (43 known modules, 2 new bundles) => d,c,foo7,foo3",
      "worker 3 (44 known modules, 2 new bundles) => p,k,j,e,b,foo6,foo2",
    ]
  `);
});

it('distributes 2 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(2), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (1 known modules) => a",
      "worker 1 (2 known modules) => b",
    ]
  `);
});

it('distributes 5 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(5), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (3 known modules) => b,a",
      "worker 1 (3 known modules) => c",
      "worker 2 (5 known modules) => e",
      "worker 3 (40 known modules) => d",
    ]
  `);
});

it('distributes 10 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(10), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (16 known modules) => h,g,a",
      "worker 1 (17 known modules) => i,f,b",
      "worker 2 (18 known modules) => j,e,c",
      "worker 3 (40 known modules) => d",
    ]
  `);
});

it('distributes 15 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(15), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (38 known modules) => m,l,g,f",
      "worker 1 (39 known modules) => n,k,h,e,a",
      "worker 2 (39 known modules) => o,j,i,c,b",
      "worker 3 (40 known modules) => d",
    ]
  `);
});

it('distributes 20 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(20), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (76 known modules) => d,m,j,h,e",
      "worker 1 (76 known modules) => s,r,n,l,g,f",
      "worker 2 (77 known modules) => t,p,o,k,i,c,b,a",
      "worker 3 (170 known modules) => q",
    ]
  `);
});

it('distributes 25 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(25), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (161 known modules) => d,w,t,r,o,m,k,i,f,e,a",
      "worker 1 (161 known modules) => y,x,u,s,p,n,l,j,h,g,c,b",
      "worker 2 (170 known modules) => q",
      "worker 3 (220 known modules) => v",
    ]
  `);
});

it('distributes 30 bundles to workers evenly', () => {
  const configs = assignBundlesToWorkers({
    ...defaultOptions,
    bundles: getBundleDefinitions(pluginsWithCounts(30), REPO),
  });

  assertReturnVal(configs);
  expect(readConfigs(configs)).toMatchInlineSnapshot(`
    Array [
      "worker 0 (172 known modules) => z,y,w,t,r,o,m,k,i,g,e",
      "worker 1 (173 known modules) => q,b,a",
      "worker 2 (173 known modules) => d,x,u,s,p,n,l,j,h,f,c",
      "worker 3 (220 known modules) => v",
    ]
  `);
});
