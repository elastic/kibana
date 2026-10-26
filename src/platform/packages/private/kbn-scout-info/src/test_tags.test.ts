/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SCOUT_PERFORMANCE_PLAYWRIGHT_TAG, testTags } from './test_tags';

const kinds = (playwrightTags: string[]) =>
  testTags.findIssues(playwrightTags).map((issue) => issue.kind);

describe('testTags', () => {
  it('lists every test target tag and the performance tag as selection tags', () => {
    expect(testTags.selection).toContain('@local-stateful-classic');
    expect(testTags.selection).toContain(SCOUT_PERFORMANCE_PLAYWRIGHT_TAG);
  });

  it('keeps limit tags out of the selection tags', () => {
    expect(testTags.limit).toEqual(['@limit/only-fips', '@limit/except-fips']);
    testTags.limit.forEach((tag) => expect(testTags.selection).not.toContain(tag));
  });

  describe('findIssues', () => {
    it('accepts a test target tag on its own', () => {
      expect(testTags.findIssues(['@local-stateful-classic'])).toEqual([]);
    });

    it('accepts the performance tag on its own', () => {
      expect(testTags.findIssues([SCOUT_PERFORMANCE_PLAYWRIGHT_TAG])).toEqual([]);
    });

    it('accepts a test target tag narrowed by a limit tag', () => {
      expect(testTags.findIssues(['@local-stateful-classic', '@limit/only-fips'])).toEqual([]);
      expect(testTags.findIssues(['@local-stateful-classic', '@limit/except-fips'])).toEqual([]);
      expect(testTags.findIssues([SCOUT_PERFORMANCE_PLAYWRIGHT_TAG, '@limit/only-fips'])).toEqual(
        []
      );
    });

    it('accepts the same limit tag twice', () => {
      expect(
        testTags.findIssues(['@local-stateful-classic', '@limit/only-fips', '@limit/only-fips'])
      ).toEqual([]);
    });

    it('reports unsupported tags', () => {
      expect(testTags.findIssues(['@local-stateful-classic', '@nonsense'])).toEqual([
        {
          kind: 'unsupported-tag',
          message: expect.stringContaining('Unsupported tag(s): @nonsense'),
        },
      ]);
    });

    it('reports malformed tags in the limit namespace separately from other unsupported tags', () => {
      expect(
        testTags.findIssues(['@local-stateful-classic', '@limit/only-quantum', '@limit/onlyfips'])
      ).toEqual([
        {
          kind: 'invalid-limit-tag',
          message: expect.stringContaining(
            'Invalid limit tag(s): @limit/only-quantum, @limit/onlyfips'
          ),
        },
      ]);
    });

    it('reports a test without any selection tag', () => {
      expect(kinds([])).toEqual(['missing-selection-tag']);
    });

    it('reports a limit tag without a selection tag', () => {
      expect(kinds(['@limit/only-fips'])).toEqual(['missing-selection-tag']);
    });

    it('reports conflicting limit tags for the same target attribute', () => {
      expect(
        testTags.findIssues(['@local-stateful-classic', '@limit/only-fips', '@limit/except-fips'])
      ).toEqual([
        {
          kind: 'conflicting-limit-tags',
          message: expect.stringContaining(
            "Conflicting limit tags for the 'fips' target attribute: @limit/only-fips, @limit/except-fips"
          ),
        },
      ]);
    });

    it('reports every issue it finds', () => {
      expect(
        kinds(['@nonsense', '@limit/bogus', '@limit/only-fips', '@limit/except-fips'])
      ).toEqual([
        'invalid-limit-tag',
        'unsupported-tag',
        'missing-selection-tag',
        'conflicting-limit-tags',
      ]);
    });
  });
});
