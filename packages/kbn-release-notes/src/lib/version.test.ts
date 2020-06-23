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
