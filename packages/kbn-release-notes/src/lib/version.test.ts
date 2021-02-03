/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Version } from './version';

it('parses version labels, returns null on failure', () => {
  expect(Version.fromLabel('v1.0.2')).toMatchInlineSnapshot(`
    Version {
      "label": "v1.0.2",
      "major": 1,
      "minor": 0,
      "patch": 2,
      "tag": undefined,
      "tagNum": undefined,
      "tagOrder": Infinity,
    }
  `);
  expect(Version.fromLabel('v1.0.0')).toMatchInlineSnapshot(`
    Version {
      "label": "v1.0.0",
      "major": 1,
      "minor": 0,
      "patch": 0,
      "tag": undefined,
      "tagNum": undefined,
      "tagOrder": Infinity,
    }
  `);
  expect(Version.fromLabel('v9.0.2')).toMatchInlineSnapshot(`
    Version {
      "label": "v9.0.2",
      "major": 9,
      "minor": 0,
      "patch": 2,
      "tag": undefined,
      "tagNum": undefined,
      "tagOrder": Infinity,
    }
  `);
  expect(Version.fromLabel('v9.0.2-alpha0')).toMatchInlineSnapshot(`
    Version {
      "label": "v9.0.2-alpha0",
      "major": 9,
      "minor": 0,
      "patch": 2,
      "tag": "alpha",
      "tagNum": 0,
      "tagOrder": 1,
    }
  `);
  expect(Version.fromLabel('v9.0.2-beta1')).toMatchInlineSnapshot(`
    Version {
      "label": "v9.0.2-beta1",
      "major": 9,
      "minor": 0,
      "patch": 2,
      "tag": "beta",
      "tagNum": 1,
      "tagOrder": 2,
    }
  `);
  expect(Version.fromLabel('v9.0')).toMatchInlineSnapshot(`undefined`);
  expect(Version.fromLabel('some:area')).toMatchInlineSnapshot(`undefined`);
});

it('sorts versions in ascending order', () => {
  const versions = [
    'v1.7.3',
    'v1.7.0',
    'v1.5.0',
    'v2.7.0',
    'v7.0.0-beta2',
    'v7.0.0-alpha1',
    'v2.0.0',
    'v0.0.0',
    'v7.0.0-beta1',
    'v7.0.0',
  ].map((l) => Version.fromLabel(l)!);

  const sorted = Version.sort(versions);

  expect(sorted.map((v) => v.label)).toMatchInlineSnapshot(`
    Array [
      "v0.0.0",
      "v1.5.0",
      "v1.7.0",
      "v1.7.3",
      "v2.0.0",
      "v2.7.0",
      "v7.0.0-alpha1",
      "v7.0.0-beta1",
      "v7.0.0-beta2",
      "v7.0.0",
    ]
  `);

  // ensure versions was not mutated
  expect(sorted).not.toEqual(versions);
});

it('sorts versions in decending order', () => {
  const versions = [
    'v1.7.3',
    'v1.7.0',
    'v1.5.0',
    'v7.0.0-beta1',
    'v2.7.0',
    'v2.0.0',
    'v0.0.0',
    'v7.0.0',
  ].map((l) => Version.fromLabel(l)!);

  const sorted = Version.sort(versions, 'desc');

  expect(sorted.map((v) => v.label)).toMatchInlineSnapshot(`
    Array [
      "v7.0.0",
      "v7.0.0-beta1",
      "v2.7.0",
      "v2.0.0",
      "v1.7.3",
      "v1.7.0",
      "v1.5.0",
      "v0.0.0",
    ]
  `);

  // ensure versions was not mutated
  expect(sorted).not.toEqual(versions);
});
