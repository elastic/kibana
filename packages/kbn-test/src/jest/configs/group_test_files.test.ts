/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groupTestFiles } from './group_test_files';

it('properly assigns tests to src roots and packages based on location', () => {
  const grouped = groupTestFiles(
    [
      '/packages/pkg1/test.js',
      '/packages/pkg1/integration_tests/test.js',
      '/packages/pkg2/integration_tests/test.js',
      '/packages/group/pkg3/test.js',
      '/packages/group/subgroup/pkg4/test.js',
      '/packages/group/subgroup/pkg4/integration_tests/test.js',
      '/src/a/integration_tests/test.js',
      '/src/b/test.js',
      '/tests/b/test.js',
      '/src/group/c/test.js',
      '/src/group/c/integration_tests/test.js',
      '/src/group/subgroup/d/test.js',
      '/src/group/subgroup/d/integration_tests/test.js',
    ],
    ['/src/group/subgroup', '/src/group', '/src'],
    ['/packages/pkg1', '/packages/pkg2', '/packages/group/pkg3', '/packages/group/subgroup/pkg4']
  );

  expect(grouped).toMatchInlineSnapshot(`
    Object {
      "grouped": Map {
        Object {
          "path": "/packages/pkg1",
          "type": "pkg",
        } => Object {
          "integration": Array [
            "/packages/pkg1/integration_tests/test.js",
          ],
          "unit": Array [
            "/packages/pkg1/test.js",
          ],
        },
        Object {
          "path": "/packages/pkg2",
          "type": "pkg",
        } => Object {
          "integration": Array [
            "/packages/pkg2/integration_tests/test.js",
          ],
        },
        Object {
          "path": "/packages/group/pkg3",
          "type": "pkg",
        } => Object {
          "unit": Array [
            "/packages/group/pkg3/test.js",
          ],
        },
        Object {
          "path": "/packages/group/subgroup/pkg4",
          "type": "pkg",
        } => Object {
          "integration": Array [
            "/packages/group/subgroup/pkg4/integration_tests/test.js",
          ],
          "unit": Array [
            "/packages/group/subgroup/pkg4/test.js",
          ],
        },
        Object {
          "path": "/src/a",
          "type": "src",
        } => Object {
          "integration": Array [
            "/src/a/integration_tests/test.js",
          ],
        },
        Object {
          "path": "/src/b",
          "type": "src",
        } => Object {
          "unit": Array [
            "/src/b/test.js",
          ],
        },
        Object {
          "path": "/src/group/c",
          "type": "src",
        } => Object {
          "integration": Array [
            "/src/group/c/integration_tests/test.js",
          ],
          "unit": Array [
            "/src/group/c/test.js",
          ],
        },
        Object {
          "path": "/src/group/subgroup/d",
          "type": "src",
        } => Object {
          "integration": Array [
            "/src/group/subgroup/d/integration_tests/test.js",
          ],
          "unit": Array [
            "/src/group/subgroup/d/test.js",
          ],
        },
      },
      "invalid": Array [
        "/tests/b/test.js",
      ],
    }
  `);
});
