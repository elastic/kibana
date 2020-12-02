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

import Path from 'path';

import { focusBundles } from './focus_bundles';
import { Bundle } from '../common';

function createBundle(id: string, deps: ReturnType<Bundle['readBundleDeps']>) {
  const bundle = new Bundle({
    type: id === 'core' ? 'entry' : 'plugin',
    id,
    contextDir: Path.resolve('/kibana/plugins', id),
    outputDir: Path.resolve('/kibana/plugins', id, 'target/public'),
    publicDirNames: ['public'],
    sourceRoot: Path.resolve('/kibana'),
  });

  jest.spyOn(bundle, 'readBundleDeps').mockReturnValue(deps);

  return bundle;
}

const BUNDLES = [
  createBundle('core', {
    implicit: [],
    explicit: [],
  }),
  createBundle('foo', {
    implicit: ['core'],
    explicit: [],
  }),
  createBundle('bar', {
    implicit: ['core'],
    explicit: ['foo'],
  }),
  createBundle('baz', {
    implicit: ['core'],
    explicit: ['bar'],
  }),
  createBundle('box', {
    implicit: ['core'],
    explicit: ['foo'],
  }),
];

function test(filters: string[]) {
  return focusBundles(filters, BUNDLES)
    .map((b) => b.id)
    .sort((a, b) => a.localeCompare(b))
    .join(', ');
}

it('returns all bundles when no focus filters are defined', () => {
  expect(test([])).toMatchInlineSnapshot(`"bar, baz, box, core, foo"`);
});

it('includes a single instance of all implicit and explicit dependencies', () => {
  expect(test(['core'])).toMatchInlineSnapshot(`"core"`);
  expect(test(['foo'])).toMatchInlineSnapshot(`"core, foo"`);
  expect(test(['bar'])).toMatchInlineSnapshot(`"bar, core, foo"`);
  expect(test(['baz'])).toMatchInlineSnapshot(`"bar, baz, core, foo"`);
  expect(test(['box'])).toMatchInlineSnapshot(`"box, core, foo"`);
});
