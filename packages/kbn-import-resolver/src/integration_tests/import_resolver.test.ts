/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Package } from '@kbn/repo-packages';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { ImportResolver } from '../import_resolver';

const FIXTURES_DIR = Path.resolve(__dirname, '../__fixtures__');

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const resolver = ImportResolver.create(FIXTURES_DIR, [
  Package.fromManifest(FIXTURES_DIR, Path.resolve(FIXTURES_DIR, 'packages/box/kibana.jsonc')),
  Package.fromManifest(FIXTURES_DIR, Path.resolve(FIXTURES_DIR, 'src/bar/kibana.jsonc')),
]);

describe('#resolve()', () => {
  it('resolves imports to packages', () => {
    expect(resolver.resolve('@kbn/box', FIXTURES_DIR)).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/packages/kbn-import-resolver/src/__fixtures__/packages/box/index.js,
        "pkgId": "@kbn/box",
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

  it('resolves nested node_module imports', () => {
    expect(resolver.resolve('bar', Path.join(FIXTURES_DIR, 'packages', 'box')))
      .toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/packages/kbn-import-resolver/src/__fixtures__/packages/box/node_modules/bar/index.js,
        "nodeModule": "bar",
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
        "pkgId": "@kbn/bar",
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
  it('returns package id for package', () => {
    expect(
      resolver.getPackageIdForPath(Path.resolve(FIXTURES_DIR, 'packages/box/index.js'))
    ).toMatchInlineSnapshot(`"@kbn/box"`);

    expect(
      resolver.getPackageIdForPath(Path.resolve(FIXTURES_DIR, 'src/bar/index.js'))
    ).toMatchInlineSnapshot(`"@kbn/bar"`);
  });

  it('returns null for files outside of a package', () => {
    expect(
      resolver.getPackageIdForPath(Path.resolve(FIXTURES_DIR, 'src/index.js'))
    ).toMatchInlineSnapshot(`null`);
  });
});

describe('#getAbsolutePackageDir()', () => {
  it('returns path for package', () => {
    expect(resolver.getAbsolutePackageDir('@kbn/box')).toMatchInlineSnapshot(
      `<absolute path>/packages/kbn-import-resolver/src/__fixtures__/packages/box`
    );
    expect(resolver.getAbsolutePackageDir('@kbn/bar')).toMatchInlineSnapshot(
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
