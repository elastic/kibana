/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { BazelPackage } from './bazel_package';
import { KibanaPackageManifest, ParsedPackageJson } from './types';

const OWN_BAZEL_BUILD_FILE = Fs.readFileSync(Path.resolve(__dirname, '../BUILD.bazel'), 'utf8');

const pkgJson: ParsedPackageJson = {
  name: 'foo',
};
const manifest: KibanaPackageManifest = {
  type: 'shared-common',
  id: '@kbn/foo',
  owner: '@elastic/kibana-operations',
  runtimeDeps: [],
  typeDeps: [],
};

describe('hasBuildRule()', () => {
  it('returns true if there is a rule with the name "build"', () => {
    const pkg = new BazelPackage('foo', manifest, pkgJson, OWN_BAZEL_BUILD_FILE);
    expect(pkg.hasBuildRule()).toBe(true);
  });

  it('returns false if there is no rule with name "build"', () => {
    const pkg = new BazelPackage('foo', manifest, pkgJson, ``);
    expect(pkg.hasBuildRule()).toBe(false);
  });

  it('returns false if there is no BUILD.bazel file', () => {
    const pkg = new BazelPackage('foo', manifest, pkgJson);
    expect(pkg.hasBuildRule()).toBe(false);
  });
});

describe('hasBuildTypesRule()', () => {
  it('returns true if there is a rule with the name "build_types"', () => {
    const pkg = new BazelPackage('foo', manifest, pkgJson, OWN_BAZEL_BUILD_FILE);
    expect(pkg.hasBuildTypesRule()).toBe(true);
  });

  it('returns false if there is no rule with name "build_types"', () => {
    const pkg = new BazelPackage('foo', manifest, pkgJson, ``);
    expect(pkg.hasBuildTypesRule()).toBe(false);
  });

  it('returns false if there is no BUILD.bazel file', () => {
    const pkg = new BazelPackage('foo', manifest, pkgJson);
    expect(pkg.hasBuildTypesRule()).toBe(false);
  });
});
