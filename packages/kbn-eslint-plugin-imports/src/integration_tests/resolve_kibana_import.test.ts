/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { createAbsolutePathSerializer } from '@kbn/dev-utils';
import { resolveKibanaImport } from '../resolve_kibana_import';

expect.addSnapshotSerializer(createAbsolutePathSerializer());

const plugin = (subPath: string) => Path.resolve(REPO_ROOT, 'src/plugins', subPath);
const xPlugin = (subPath: string) => Path.resolve(REPO_ROOT, 'x-pack/plugins', subPath);
const pkg = (subPath: string) => Path.resolve(REPO_ROOT, 'packages', subPath);

describe('standard import formats', () => {
  it('resolves requests to src/', () => {
    expect(resolveKibanaImport('src/core/public', plugin('discovery/public/components/foo')))
      .toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/src/core/public/index.ts,
        "type": "file",
      }
    `);
    expect(resolveKibanaImport('src/core/server', xPlugin('spaces/server/routes')))
      .toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/src/core/server/index.ts,
        "type": "file",
      }
    `);
    expect(resolveKibanaImport('src/core/utils', pkg('kbn-dev-utils/lib'))).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/src/core/utils/index.ts,
        "type": "file",
      }
    `);
  });

  it('resolves relative paths too', () => {
    expect(resolveKibanaImport('../../../../core/public', plugin('foo/bar/baz')))
      .toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/src/core/public/index.ts,
        "type": "file",
      }
    `);
  });

  it('resolves @kbn/ imports', () => {
    expect(resolveKibanaImport('@kbn/std', pkg('kbn-dev-utils/src'))).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/node_modules/@kbn/std/target_node/index.js,
        "nodeModule": "@kbn/std",
        "type": "file",
      }
    `);
  });

  it('resolves @elastic/ imports', () => {
    expect(resolveKibanaImport('@elastic/datemath', pkg('kbn-dev-utils/src')))
      .toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/node_modules/@elastic/datemath/target_node/index.js,
        "nodeModule": "@elastic/datemath",
        "type": "file",
      }
    `);

    expect(resolveKibanaImport('@elastic/eui', pkg('kbn-dev-utils/src'))).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/node_modules/@elastic/eui/lib/index.js,
        "nodeModule": "@elastic/eui",
        "type": "file",
      }
    `);
  });

  it('resolves normal node module imports', () => {
    expect(resolveKibanaImport('lodash', pkg('kbn-dev-utils/src'))).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/node_modules/lodash/lodash.js,
        "nodeModule": "lodash",
        "type": "file",
      }
    `);

    expect(resolveKibanaImport('globby', pkg('kbn-dev-utils/src'))).toMatchInlineSnapshot(`
      Object {
        "absolute": <absolute path>/node_modules/globby/index.js,
        "nodeModule": "globby",
        "type": "file",
      }
    `);
  });

  it('returns null when the import cannot be resolved', () => {
    expect(resolveKibanaImport('../../../../invalid', plugin('foo/bar'))).toMatchInlineSnapshot(
      `null`
    );
    expect(resolveKibanaImport('src/invalid', plugin('foo/bar'))).toMatchInlineSnapshot(`null`);
    expect(resolveKibanaImport('kibana/invalid', plugin('foo/bar'))).toMatchInlineSnapshot(`null`);
    expect(resolveKibanaImport('@kbn/invalid', plugin('foo/bar'))).toMatchInlineSnapshot(`null`);
  });

  it('returns ignore results for known unresolvable but okay import statements', () => {
    expect(resolveKibanaImport('../../grammar/built_grammar.js', plugin('foo/bar')))
      .toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolveKibanaImport('kibana-buildkite-library', pkg('kbn-foo/src')))
      .toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolveKibanaImport('core_styles', pkg('kbn-foo/src'))).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolveKibanaImport('core_app_image_assets', pkg('kbn-foo/src'))).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolveKibanaImport('ace/lib/dom', pkg('kbn-foo/src'))).toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolveKibanaImport('@elastic/eui/src/components/', pkg('kbn-foo/src')))
      .toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);

    expect(resolveKibanaImport('@elastic/eui/src/services/', pkg('kbn-foo/src')))
      .toMatchInlineSnapshot(`
      Object {
        "type": "ignore",
      }
    `);
  });
});
