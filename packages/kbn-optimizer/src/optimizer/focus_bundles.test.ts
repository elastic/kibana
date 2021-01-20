/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
