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

import { format } from 'util';

import Mocha from 'mocha';
import { create as createSuite } from 'mocha/lib/suite';
import Test from 'mocha/lib/test';

import { filterSuitesByTags } from './filter_suites_by_tags';

function setup({ include, exclude }) {
  return new Promise((resolve) => {
    const history = [];

    const mocha = new Mocha({
      reporter: class {
        constructor(runner) {
          runner.on('hook', (hook) => {
            history.push(`hook:  ${hook.fullTitle()}`);
          });

          runner.on('pass', (test) => {
            history.push(`test:  ${test.fullTitle()}`);
          });

          runner.on('suite', (suite) => {
            history.push(`suite: ${suite.fullTitle()}`);
          });
        }

        done() {
          resolve({
            history,
            mocha,
          });
        }
      },
    });

    mocha.suite.beforeEach(function rootBeforeEach() {});

    const level1 = createSuite(mocha.suite, 'level 1');
    level1.beforeEach(function level1BeforeEach() {});
    level1._tags = ['level1'];

    const level1a = createSuite(level1, 'level 1a');
    level1a._tags = ['level1a'];
    level1a.addTest(new Test('test 1a', () => {}));

    const level1b = createSuite(level1, 'level 1b');
    level1b._tags = ['level1b'];
    level1b.addTest(new Test('test 1b', () => {}));

    const level2 = createSuite(mocha.suite, 'level 2');
    const level2a = createSuite(level2, 'level 2a');
    level2a._tags = ['level2a'];
    level2a.addTest(new Test('test 2a', () => {}));

    filterSuitesByTags({
      log: {
        info(...args) {
          history.push(`info: ${format(...args)}`);
        },
      },
      mocha,
      include,
      exclude,
    });

    mocha.run();
  });
}

it('only runs hooks of parents and tests in level1a', async () => {
  const { history } = await setup({
    include: ['level1a'],
    exclude: [],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Only running suites (and their sub-suites) if they include the tag(s): [ 'level1a' ]",
      "suite: ",
      "suite: level 1",
      "suite: level 1 level 1a",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "hook:  level 1 \\"before each\\" hook: level1BeforeEach",
      "test:  level 1 level 1a test 1a",
    ]
  `);
});

it('only runs hooks of parents and tests in level1b', async () => {
  const { history } = await setup({
    include: ['level1b'],
    exclude: [],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Only running suites (and their sub-suites) if they include the tag(s): [ 'level1b' ]",
      "suite: ",
      "suite: level 1",
      "suite: level 1 level 1b",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "hook:  level 1 \\"before each\\" hook: level1BeforeEach",
      "test:  level 1 level 1b test 1b",
    ]
  `);
});

it('only runs hooks of parents and tests in level1a and level1b', async () => {
  const { history } = await setup({
    include: ['level1a', 'level1b'],
    exclude: [],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Only running suites (and their sub-suites) if they include the tag(s): [ 'level1a', 'level1b' ]",
      "suite: ",
      "suite: level 1",
      "suite: level 1 level 1a",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "hook:  level 1 \\"before each\\" hook: level1BeforeEach",
      "test:  level 1 level 1a test 1a",
      "suite: level 1 level 1b",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "hook:  level 1 \\"before each\\" hook: level1BeforeEach",
      "test:  level 1 level 1b test 1b",
    ]
  `);
});

it('only runs level1a if including level1 and excluding level1b', async () => {
  const { history } = await setup({
    include: ['level1'],
    exclude: ['level1b'],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Only running suites (and their sub-suites) if they include the tag(s): [ 'level1' ]",
      "info: Filtering out any suites that include the tag(s): [ 'level1b' ]",
      "suite: ",
      "suite: level 1",
      "suite: level 1 level 1a",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "hook:  level 1 \\"before each\\" hook: level1BeforeEach",
      "test:  level 1 level 1a test 1a",
    ]
  `);
});

it('only runs level1b if including level1 and excluding level1a', async () => {
  const { history } = await setup({
    include: ['level1'],
    exclude: ['level1a'],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Only running suites (and their sub-suites) if they include the tag(s): [ 'level1' ]",
      "info: Filtering out any suites that include the tag(s): [ 'level1a' ]",
      "suite: ",
      "suite: level 1",
      "suite: level 1 level 1b",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "hook:  level 1 \\"before each\\" hook: level1BeforeEach",
      "test:  level 1 level 1b test 1b",
    ]
  `);
});

it('only runs level2 if excluding level1', async () => {
  const { history } = await setup({
    include: [],
    exclude: ['level1'],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Filtering out any suites that include the tag(s): [ 'level1' ]",
      "suite: ",
      "suite: level 2",
      "suite: level 2 level 2a",
      "hook:  \\"before each\\" hook: rootBeforeEach",
      "test:  level 2 level 2a test 2a",
    ]
  `);
});

it('does nothing if everything excluded', async () => {
  const { history } = await setup({
    include: [],
    exclude: ['level1', 'level2a'],
  });

  expect(history).toMatchInlineSnapshot(`
    Array [
      "info: Filtering out any suites that include the tag(s): [ 'level1', 'level2a' ]",
    ]
  `);
});
