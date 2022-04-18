/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';

import { ImportResolver } from '../import_resolver';

const FIXTURES_DIR = Path.resolve(__dirname, '../__fixtures__');

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const resolver = new ImportResolver(
  FIXTURES_DIR,
  new Map([['@pkg/box', 'packages/box']]),
  new Map([['@synth/bar', 'src/bar']])
);

describe('#resolve()', () => {
  it('resolves imports to synth packages', () => {
    expect(resolver.resolve('@synth/bar', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/packages/kbn-import-resolver/src/__fixtures__/src/bar/index.js,
        "type": "file",
      }
    `);
  });

  it('resolves imports to bazel packages that are also found in node_modules', () => {
    expect(resolver.resolve('@pkg/box', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/packages/kbn-import-resolver/src/__fixtures__/node_modules/@pkg/box/index.js,
        "nodeModule": "@pkg/box",
        "type": "file",
      }
    `);
  });

  it('resolves node_module imports', () => {
    expect(resolver.resolve('foo', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/packages/kbn-import-resolver/src/__fixtures__/node_modules/foo/index.js,
        "nodeModule": "foo",
        "type": "file",
      }
    `);
  });

  it('resolves requests to src/', () => {
    expect(resolver.resolve('src/core/public', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/src/core/public/index.ts,
        "type": "file",
      }
    `);
  });

  it('resolves relative paths', () => {
    expect(resolver.resolve('./bar', Path.resolve(FIXTURES_DIR, 'src/bar'))).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/packages/kbn-import-resolver/src/__fixtures__/src/bar/bar.js,
        "type": "file",
      }
    `);
  });

  it('returns null when the import cannot be resolved', () => {
    expect(resolver.resolve('../../../../invalid', FIXTURES_DIR)).toMatchInlineSnapshot(`null`);
    expect(resolver.resolve('src/invalid', FIXTURES_DIR)).toMatchInlineSnapshot(`null`);
    expect(resolver.resolve('kibana/invalid', FIXTURES_DIR)).toMatchInlineSnapshot(`null`);
    expect(resolver.resolve('@kbn/invalid', FIXTURES_DIR)).toMatchInlineSnapshot(`null`);
  });

  it('returns ignore results for known unresolvable but okay import statements', () => {
    expect(resolver.resolve('../../grammar/built_grammar.js', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolver.resolve('kibana-buildkite-library', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolver.resolve('core_styles', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolver.resolve('core_app_image_assets', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolver.resolve('ace/lib/dom', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolver.resolve('@elastic/eui/src/components/foo', FIXTURES_DIR))
      .toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolver.resolve('@elastic/eui/src/services/foo', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);
  });
});

describe('#getPackageIdForPath()', () => {
  it('returns package id for bazel package', () => {
    expect(
      resolver.getPackageIdForPath(Path.resolve(FIXTURES_DIR, 'packages/box/index.js'))
    ).toMatchInlineSnapshot(`"@pkg/box"`);
  });

  it('returns package id for synth package', () => {
    expect(
      resolver.getPackageIdForPath(Path.resolve(FIXTURES_DIR, 'src/bar/index.js'))
    ).toMatchInlineSnapshot(`"@synth/bar"`);
  });

  it('returns null for files outside of a package', () => {
    expect(
      resolver.getPackageIdForPath(Path.resolve(FIXTURES_DIR, 'src/index.js'))
    ).toMatchInlineSnapshot(`null`);
  });
});

describe('#getAbsolutePackageDir()', () => {
  it('returns path for bazel package', () => {
    expect(resolver.getAbsolutePackageDir('@pkg/box')).toMatchInlineSnapshot(
      `<absolute path>/packages/kbn-import-resolver/src/__fixtures__/packages/box`
    );
  });
  it('returns path for synth package', () => {
    expect(resolver.getAbsolutePackageDir('@synth/bar')).toMatchInlineSnapshot(
      `<absolute path>/packages/kbn-import-resolver/src/__fixtures__/src/bar`
    );
  });
  it('returns null for node_modules', () => {
    expect(resolver.getAbsolutePackageDir('foo')).toMatchInlineSnapshot(`null`);
  });
  it('returns null for unknown packages', () => {
    expect(resolver.getAbsolutePackageDir('@kbn/invalid')).toMatchInlineSnapshot(`null`);
  });
});

describe('#isBazelPackage()', () => {
  it('returns true for bazel packages', () => {
    expect(resolver.isBazelPackage('@pkg/box')).toBe(true);
  });
  it('returns false for synth packages', () => {
    expect(resolver.isBazelPackage('@synth/bar')).toBe(false);
  });
  it('returns false for node_modules packages', () => {
    expect(resolver.isBazelPackage('foo')).toBe(false);
  });
  it('returns false for unknown packages', () => {
    expect(resolver.isBazelPackage('@kbn/invalid')).toBe(false);
  });
});

describe('#isSyntheticPackage()', () => {
  it('returns true for synth packages', () => {
    expect(resolver.isSyntheticPackage('@synth/bar')).toBe(true);
  });
  it('returns false for bazel packages', () => {
    expect(resolver.isSyntheticPackage('@pkg/box')).toBe(false);
  });
  it('returns false for node_modules packages', () => {
    expect(resolver.isSyntheticPackage('foo')).toBe(false);
  });
  it('returns false for unknown packages', () => {
    expect(resolver.isSyntheticPackage('@kbn/invalid')).toBe(false);
  });
});
