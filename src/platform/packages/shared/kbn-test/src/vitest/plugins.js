/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Vite plugins that reproduce the Kibana Jest resolver and SWC transformer for Vitest.
 * The resolver mirrors src/jest/resolver.js; the transform uses the same SWC config as Jest
 * but emits ESM so Vitest can hoist vi.mock() and evaluate modules natively.
 */

const Crypto = require('crypto');
const Fs = require('fs');
const Path = require('path');
const { isBuiltin } = require('module');
const Swc = require('@swc/core');
const { REPO_ROOT } = require('@kbn/repo-info');
const { readPackageMap } = require('@kbn/repo-packages');
const { getJestSwcConfig } = require('@kbn/swc-config/jest');
const Peggy = require('@kbn/peggy');
const remapping = require('@ampproject/remapping');
const { prepareSource, makeEmotionLabelsSafe } = require('../jest/transforms/swc');

const APM_AGENT_MOCK = Path.resolve(__dirname, '../jest/mocks/apm_agent_mock.ts');

const VIRTUAL_PREFIX = '\0kbn-vitest:';
const VIRTUAL_MODULES = {
  'file-mock': `export default 'test-file-stub';`,
  'style-mock': `export default {};`,
  'worker-mock': `export default '';`,
  'css-module-mock': `export default new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : key) });`,
};

const STATIC_FILE_EXT = new Set(
  `jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga`
    .split('|')
    .map((ext) => `.${ext}`)
);
const RAW_TEXT_EXT = new Set(['.txt', '.html', '.yaml', '.yml']);
const SWC_EXT = /\.(m?js|jsx|tsx?)$/;

const virtual = (name) => `${VIRTUAL_PREFIX}${name}`;

const getAssetMock = (request) => {
  const cleanRequest = request.endsWith('?raw') ? request.slice(0, -'?raw'.length) : request;
  const ext = Path.extname(cleanRequest);
  if (!ext) {
    return request.endsWith('?asUrl') ? virtual('file-mock') : undefined;
  }

  const basename = Path.basename(cleanRequest, ext);
  if ((ext === '.css' || ext === '.scss') && basename.endsWith('.module')) {
    return virtual('css-module-mock');
  }
  if (ext === '.css' || ext === '.less' || ext === '.scss') {
    return virtual('style-mock');
  }
  if (STATIC_FILE_EXT.has(ext)) {
    return virtual('file-mock');
  }
  if (ext === '.worker' && basename.endsWith('.editor')) {
    return virtual('worker-mock');
  }
  return request.endsWith('?asUrl') ? virtual('file-mock') : undefined;
};

/** Resolves Kibana module ids the same way the Jest resolver does. */
const kbnResolvePlugin = () => {
  const pkgMap = readPackageMap();

  return {
    name: 'kbn-vitest-resolve',
    enforce: 'pre',

    async resolveId(source, importer, options) {
      if (source.startsWith(VIRTUAL_PREFIX)) {
        return source;
      }

      // Like the Jest resolver (`resolve` prefers core modules), never swap a Node builtin for a
      // same-named npm browser polyfill such as `buffer` or `events` in the jsdom environment.
      if (!source.startsWith('node:') && isBuiltin(source)) {
        return { id: `node:${source}`, external: true };
      }

      if (source === '@elastic/eui') {
        return this.resolve('@elastic/eui/test-env', importer, { ...options, skipSelf: true });
      }

      if (source.startsWith('@elastic/eui/lib/')) {
        return this.resolve(
          source.replace('@elastic/eui/lib/', '@elastic/eui/test-env/'),
          importer,
          {
            ...options,
            skipSelf: true,
          }
        );
      }

      if (source === 'elastic-apm-node') {
        return APM_AGENT_MOCK;
      }

      const assetMock = getAssetMock(source);
      if (assetMock) {
        return assetMock;
      }

      if (source.startsWith('@kbn/')) {
        const [, id, ...sub] = source.split('/');
        const pkgDir = pkgMap.get(`@kbn/${id}`);
        if (!pkgDir) {
          throw new Error(
            `unable to resolve pkg import, pkg '@kbn/${id}' is not in the pkg map. Do you need to bootstrap?`
          );
        }

        return this.resolve(Path.resolve(REPO_ROOT, pkgDir, ...sub), importer, {
          ...options,
          skipSelf: true,
        });
      }

      return null;
    },

    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        return VIRTUAL_MODULES[id.slice(VIRTUAL_PREFIX.length)];
      }

      const [path, query] = id.split('?');
      if (query || path.includes('/node_modules/')) {
        return null;
      }

      const ext = Path.extname(path);
      if (RAW_TEXT_EXT.has(ext) || ext === '.text') {
        return `export default ${JSON.stringify(Fs.readFileSync(path, 'utf8'))};`;
      }

      if (ext === '.peggy' || ext === '.peg') {
        return Peggy.getJsSourceSync({
          content: Fs.readFileSync(path, 'utf8'),
          path,
          format: 'esm',
          optimize: 'speed',
        }).source;
      }

      return null;
    },
  };
};

// fsModuleCache does not see plugin code; hash everything that affects transform output.
const TRANSFORM_CACHE_KEY = Crypto.createHash('sha256')
  .update(Fs.readFileSync(__filename))
  // Path.resolve (not require.resolve) keeps this correct when Vite bundles a config importing it
  .update(Fs.readFileSync(Path.resolve(__dirname, '../jest/transforms/swc/index.js')))
  .update(Fs.readFileSync(require.resolve('@kbn/swc-config/jest')))
  .update(require('@swc/core/package.json').version)
  .update(require('@swc/plugin-emotion/package.json').version)
  .digest('hex');

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
/**
 * Shared mock helpers also run under the Jest integration tests, so they keep `jest.mock()`.
 * Renames those statements to `vi.mock()` so Vitest hoists them like Jest did; padded so columns
 * don't move. Test files were codemodded already (and may hold `jest.mock(` in string fixtures).
 */
const hoistJestMocks = (code) =>
  code.replace(
    /^([ \t]*)jest\.(mock|doMock|unmock|doUnmock)\(/gm,
    (_, indent, api) => `${indent}  vi.${api}(`
  );

/**
 * Compiles Kibana sources with the Jest SWC config (decorators, emotion labels) as ESM, after the
 * same source rewrites the Jest transformer applies (JSX string attributes, enums, lazyObject).
 */
const kbnSwcPlugin = () => ({
  name: 'kbn-vitest-swc',
  enforce: 'pre',

  configureVitest({ defineCacheKeyGenerator }) {
    defineCacheKeyGenerator(() => TRANSFORM_CACHE_KEY);
  },

  async transform(code, id) {
    const [path] = id.split('?');
    if (!SWC_EXT.test(path) || path.includes('/node_modules/') || id.startsWith('\0')) {
      return null;
    }

    const source = TEST_FILE.test(path) ? code : hoistJestMocks(code);
    const prepared = prepareSource(source, path);
    const result = await Swc.transform(prepared.code, {
      ...getJestSwcConfig(path),
      sourceMaps: true,
      inlineSourcesContent: true,
      module: { type: 'es6' },
    });

    const map = prepared.map ? remapping([result.map, prepared.map], () => null) : result.map;
    // Same fix-up as the Jest transformer so emotion class hashes (and snapshots) match.
    return { code: makeEmotionLabelsSafe(result.code), map };
  },
});

/**
 * Resolves package exports with the `node` condition only, in every environment. Jest resolved
 * bare specifiers through `main` (the `resolve` package ignores `exports`), which is what Node's
 * conditions pick; `browser` gave natively loaded packages untranspiled ESM builds (e.g.
 * @aws-sdk/core's dist-es with extensionless imports), and mixing it for Vite-resolved imports
 * with `node` for native ones duplicates packages like @emotion/react (separate theme contexts).
 * Vitest also adds `development` to the ssr conditions and passes them to workers as
 * `--conditions`, which loaded dev builds (e.g. emotion) that render differently. User config
 * arrays are concatenated, so the resolved config has to be overwritten.
 */
const kbnConditionsPlugin = () => {
  const conditions = ['node'];
  return {
    name: 'kbn-vitest-conditions',
    enforce: 'post',
    configResolved(config) {
      config.resolve.conditions = conditions;
      config.ssr.resolve.conditions = conditions;
      config.ssr.resolve.externalConditions = conditions;
      for (const env of Object.values(config.environments ?? {})) {
        env.resolve.conditions = conditions;
        env.resolve.externalConditions = conditions;
      }
    },
  };
};

const matchAlias = (find, source) => {
  if (typeof find !== 'string') {
    return find.test(source);
  }
  return source === find || source.startsWith(`${find}/`);
};

/**
 * Config `aliases` (Jest's moduleNameMapper / root `__mocks__` for packages). The replacement
 * module itself resolves the aliased specifier to the real module, which is how such mocks
 * re-export the original (Jest: `jest.requireActual`) with a lint-stable import.
 */
const kbnAliasPlugin = (aliases) => ({
  name: 'kbn-vitest-aliases',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    const alias = aliases.find(({ find }) => matchAlias(find, source));
    if (!alias || (importer && importer.split('?')[0] === alias.replacement)) {
      return null;
    }
    const { find, replacement } = alias;
    const target =
      typeof find === 'string'
        ? replacement + source.slice(find.length)
        : source.replace(find, replacement);
    return (await this.resolve(target, importer, { ...options, skipSelf: true })) ?? target;
  },
});

const kbnVitestPlugins = (aliases = []) => [
  kbnAliasPlugin(aliases),
  kbnResolvePlugin(),
  kbnSwcPlugin(),
  kbnConditionsPlugin(),
];

module.exports = { kbnVitestPlugins };
