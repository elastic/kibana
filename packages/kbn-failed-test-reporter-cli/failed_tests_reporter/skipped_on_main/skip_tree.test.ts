/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { findSkipForFullTitle, findSkipForScoutFailure, parseSuiteTree } from './skip_tree';

const fixture = (name: string) =>
  Fs.readFileSync(Path.resolve(__dirname, '__fixtures__', `${name}.ts.txt`), 'utf8');

describe('parseSuiteTree', () => {
  it('builds the describe/test tree for mocha style FTR files', () => {
    const tree = parseSuiteTree(`
      export default function ({ getService }) {
        describe('outer', function () {
          before(async () => {});
          it('first', async () => {});
          describe('inner', () => {
            it('second', () => {});
          });
        });
      }
    `);

    expect(tree).toEqual([
      {
        kind: 'describe',
        title: 'outer',
        skipped: false,
        children: [
          { kind: 'test', title: 'first', skipped: false, children: [] },
          {
            kind: 'describe',
            title: 'inner',
            skipped: false,
            children: [{ kind: 'test', title: 'second', skipped: false, children: [] }],
          },
        ],
      },
    ]);
  });

  it('marks .skip, .fixme, xit and xdescribe as skipped and picks up the issue comment', () => {
    const tree = parseSuiteTree(`
      // Failing: See https://github.com/elastic/kibana/issues/123
      describe.skip('a', () => {
        xit('b', () => {});
        it.skip('c', () => {});
        test.fixme('d', async () => {});
      });
      xdescribe('e', () => {});
      describe('f', () => {});
    `);

    expect(tree.map(({ title, skipped, issue }) => ({ title, skipped, issue }))).toEqual([
      { title: 'a', skipped: true, issue: 'https://github.com/elastic/kibana/issues/123' },
      { title: 'e', skipped: true, issue: undefined },
      { title: 'f', skipped: false, issue: undefined },
    ]);
    expect(tree[0].children.map(({ title, skipped }) => ({ title, skipped }))).toEqual([
      { title: 'b', skipped: true },
      { title: 'c', skipped: true },
      { title: 'd', skipped: true },
    ]);
  });

  it('handles Scout callee chains and options objects', () => {
    const tree = parseSuiteTree(`
      apiTest.describe.skip('api suite', { tag: tags.stateful.classic }, () => {
        apiTest('case', async ({ apiClient }) => {});
      });
      spaceTest.describe.serial('ui suite', () => {
        spaceTest.skip('flaky', async () => {});
      });
    `);

    expect(tree).toEqual([
      {
        kind: 'describe',
        title: 'api suite',
        skipped: true,
        issue: undefined,
        children: [{ kind: 'test', title: 'case', skipped: false, children: [] }],
      },
      {
        kind: 'describe',
        title: 'ui suite',
        skipped: false,
        children: [{ kind: 'test', title: 'flaky', skipped: true, issue: undefined, children: [] }],
      },
    ]);
  });

  it('records dynamic titles as null so they never match', () => {
    const tree = parseSuiteTree(
      'describe.skip(`dynamic ${x}`, () => {}); describe(title, () => {});'
    );
    expect(tree.map(({ title }) => title)).toEqual([null, null]);
    expect(findSkipForFullTitle(tree, 'dynamic 1 test').skip).toBeUndefined();
  });
});

describe('findSkipForFullTitle', () => {
  const tree = parseSuiteTree(fixture('ftr_cases_configure_legacy.after'));

  it('matches a test under a skipped describe, after parent-file suite titles', () => {
    const { skip } = findSkipForFullTitle(
      tree,
      'Cases Configure - legacy custom fields and templates Custom fields adds a custom field'
    );
    expect(skip?.title).toBe('Configure - legacy custom fields and templates');
    expect(skip?.issue).toBe('https://github.com/elastic/kibana/issues/280016');
  });

  it('matches before/after hook failures of a skipped describe', () => {
    const suite = 'Cases Configure - legacy custom fields and templates';
    expect(
      findSkipForFullTitle(tree, `${suite} "before all" hook in "${suite}"`).skip
    ).toBeDefined();
    expect(
      findSkipForFullTitle(
        tree,
        `${suite} Custom fields "before each" hook for "adds a custom field"`
      ).skip
    ).toBeDefined();
    expect(findSkipForFullTitle(tree, `${suite} "after all" hook`).skip).toBeDefined();
  });

  it('does not match when the file has no skip covering the test', () => {
    const before = parseSuiteTree(fixture('ftr_cases_configure_legacy.before'));
    expect(
      findSkipForFullTitle(
        before,
        'Cases Configure - legacy custom fields and templates Custom fields adds a custom field'
      )
    ).toEqual({ skip: undefined, allUnskipped: true });
  });

  it('anchors the chain at the end of the full title, after unknown parent suites', () => {
    const t = parseSuiteTree(`describe.skip('alert', () => { it('runs', () => {}); });`);
    expect(findSkipForFullTitle(t, 'alerting rules alert runs').skip?.title).toBe('alert');
    expect(findSkipForFullTitle(t, 'alert runs').skip?.title).toBe('alert');
    expect(findSkipForFullTitle(t, 'alerting rules alerts runs').skip).toBeUndefined();
    expect(findSkipForFullTitle(t, 'alerting rules alert runs twice').skip).toBeUndefined();
    expect(findSkipForFullTitle(t, 'alerting runs').skip).toBeUndefined();
  });

  it('does not forgive an unrelated test that merely mentions a skipped root title', () => {
    const t = parseSuiteTree(`
      describe.skip('Templates', () => { it('renders', () => {}); });
      describe('Custom fields', () => { it('Templates section works', () => {}); });
    `);
    expect(
      findSkipForFullTitle(t, 'Cases Custom fields Templates section works').skip
    ).toBeUndefined();
    expect(findSkipForFullTitle(t, 'Cases Templates renders').skip?.title).toBe('Templates');
  });

  it('does not match a nested skipped suite out of its chain', () => {
    const t = parseSuiteTree(`
      describe('outer', () => {
        describe.skip('inner', () => { it('t', () => {}); });
        describe('other', () => { it('inner t', () => {}); });
      });
    `);
    expect(findSkipForFullTitle(t, 'root outer inner t').skip?.title).toBe('inner');
    expect(findSkipForFullTitle(t, 'root outer other inner t').skip).toBeUndefined();
  });

  it('does not match through a dynamic title', () => {
    const t = parseSuiteTree(
      'describe.skip(`dyn ${x}`, () => { describe("inner", () => { it("t", () => {}); }); });'
    );
    // The test may be under the dynamic describe (its runtime title may be anything), but the
    // chain cannot be proven either way, so it is neither skipped nor provably unskipped.
    expect(findSkipForFullTitle(t, 'root dyn 1 inner t')).toEqual({
      skip: undefined,
      allUnskipped: false,
    });
    expect(findSkipForFullTitle(t, 'root other inner t').skip).toBeUndefined();
  });

  it('does not forgive when the title may also come from an unskipped dynamic describe', () => {
    const t = parseSuiteTree(`
      describe.skip('same', () => { it('case', () => {}); });
      describe(runtimeTitle, () => { it('case', () => {}); });
    `);
    expect(findSkipForFullTitle(t, 'root same case').skip).toBeUndefined();
  });

  it('does not forgive when a shorter suffix of the title also occurs unskipped', () => {
    const t = parseSuiteTree(`
      describe('b', () => { it('c', () => {}); });
      describe('x', () => { describe.skip('b', () => { it('c', () => {}); }); });
    `);
    // 'x' may be a describe in this file or a wrapping config title; both alignments are valid.
    expect(findSkipForFullTitle(t, 'root x b c').skip).toBeUndefined();
    expect(findSkipForFullTitle(t, 'root b c').skip).toBeUndefined();
  });
});

describe('findSkipForScoutFailure', () => {
  const FILE = 'x-pack/platform/plugins/a/test/scout/api/tests/ai_indices.spec.ts';

  it('matches a test whose nearest describe is skipped', () => {
    const tree = parseSuiteTree(fixture('scout_ai_indices.after'));
    const { skip } = findSkipForScoutFailure(
      tree,
      'context engine AI indices API',
      'manages an AI index through its full lifecycle',
      FILE
    );
    expect(skip?.issue).toBe('https://github.com/elastic/kibana/issues/280639');
    expect(
      findSkipForScoutFailure(
        parseSuiteTree(fixture('scout_ai_indices.before')),
        'context engine AI indices API',
        'manages an AI index through its full lifecycle',
        FILE
      )
    ).toEqual({ skip: undefined, allUnskipped: true });
  });

  it('matches a root-level test through the Playwright file suite title', () => {
    const tree = parseSuiteTree(`
      test.skip('flaky', async () => {});
      apiTest('ok', async () => {});
      test.describe('d', () => { test('flaky', async () => {}); });
    `);
    // Playwright titles the file suite with the spec path relative to testDir.
    expect(
      findSkipForScoutFailure(tree, 'tests/ai_indices.spec.ts', 'flaky', FILE).skip?.title
    ).toBe('flaky');
    expect(findSkipForScoutFailure(tree, FILE, 'flaky', FILE).skip?.title).toBe('flaky');
    expect(
      findSkipForScoutFailure(tree, 'tests/ai_indices.spec.ts', 'ok', FILE).skip
    ).toBeUndefined();
    expect(findSkipForScoutFailure(tree, 'other.spec.ts', 'flaky', FILE).skip).toBeUndefined();
    expect(findSkipForScoutFailure(tree, 'indices.spec.ts', 'flaky', FILE).skip).toBeUndefined();
    expect(findSkipForScoutFailure(tree, 'd', 'flaky', FILE).skip).toBeUndefined();
  });

  it('matches through a skipped grandparent and a skipped test itself', () => {
    const tree = parseSuiteTree(`
      test.describe.skip('outer', () => {
        test.describe('inner', () => { test('t', async () => {}); });
      });
      test.describe('plain', () => {
        test.skip('flaky', async () => {});
        test('ok', async () => {});
      });
    `);
    expect(findSkipForScoutFailure(tree, 'inner', 't', FILE).skip?.title).toBe('outer');
    expect(findSkipForScoutFailure(tree, 'plain', 'flaky', FILE).skip?.title).toBe('flaky');
    expect(findSkipForScoutFailure(tree, 'plain', 'ok', FILE).skip).toBeUndefined();
    expect(findSkipForScoutFailure(tree, 'outer', 't', FILE).skip).toBeUndefined();
  });

  it('does not forgive when the same suite/title pair also occurs unskipped', () => {
    const tree = parseSuiteTree(`
      test.describe('a', () => {
        test.describe('b', () => { test('c', async () => {}); });
      });
      test.describe.skip('x', () => {
        test.describe('b', () => { test('c', async () => {}); });
      });
    `);
    expect(findSkipForScoutFailure(tree, 'b', 'c', FILE).skip).toBeUndefined();
  });

  it('forgives when every occurrence of the suite/title pair is skipped', () => {
    const tree = parseSuiteTree(`
      test.describe.skip('a', () => {
        test.describe('b', () => { test('c', async () => {}); });
      });
      test.describe('x', () => {
        test.describe.skip('b', () => { test('c', async () => {}); });
      });
    `);
    expect(findSkipForScoutFailure(tree, 'b', 'c', FILE).skip?.title).toBe('a');
  });

  it('does not forgive when the title may also come from a describe with a dynamic title', () => {
    const tree = parseSuiteTree(`
      test.describe.skip('b', () => { test('c', async () => {}); });
      test.describe(runtimeTitle, () => { test('c', async () => {}); });
    `);
    expect(findSkipForScoutFailure(tree, 'b', 'c', FILE)).toEqual({
      skip: undefined,
      allUnskipped: false,
    });
    expect(findSkipForScoutFailure(tree, 'b', 'd', FILE).allUnskipped).toBe(false);
  });
});
