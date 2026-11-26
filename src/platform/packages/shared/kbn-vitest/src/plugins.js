/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Crypto = require('crypto');
const Path = require('path');
const { isBuiltin } = require('module');
const Peggy = require('@kbn/peggy');
const { getJestSwcConfig } = require('@kbn/swc-config/jest');

const KBN_JEST_DIR = Path.dirname(require.resolve('@kbn/jest/package.json'));
const MOCKS_DIR = Path.resolve(KBN_JEST_DIR, 'src/mocks');
// The Jest transformer: SWC with Kibana's config (emotion labels, decorators, JSX via
// @emotion/react) plus the source rewrites Babel used to do. Asked for ESM so Vitest can hoist
// `vi.mock()` and evaluate modules natively.
const jestTransformer = require('@kbn/jest/src/transforms/swc');

const STATIC_FILE_EXT = new Set(
  'jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga'
    .split('|')
    .map((ext) => `.${ext}`)
);
const RAW_TEXT_EXT = new Set(['.txt', '.html', '.yaml', '.yml', '.text']);
const SWC_EXT = /\.(m?js|jsx|tsx?)$/;

/** Same asset stubs as the Jest resolver (`src/resolver.js` in @kbn/jest). */
const getAssetMock = (request) => {
  const cleanRequest = request.endsWith('?raw') ? request.slice(0, -'?raw'.length) : request;
  const ext = Path.extname(cleanRequest);
  const basename = Path.basename(cleanRequest, ext);

  if ((ext === '.css' || ext === '.scss') && basename.endsWith('.module')) {
    return Path.resolve(MOCKS_DIR, 'css_module_mock.js');
  }
  if (ext === '.css' || ext === '.less' || ext === '.scss') {
    return Path.resolve(MOCKS_DIR, 'style_mock.js');
  }
  if (STATIC_FILE_EXT.has(ext) || request.endsWith('?asUrl')) {
    return Path.resolve(MOCKS_DIR, 'file_mock.js');
  }
  if (ext === '.worker' && basename.endsWith('.editor')) {
    return Path.resolve(MOCKS_DIR, 'worker_module_mock.js');
  }
};

/** Resolver rules of the Jest jsdom preset: EUI's test-env build and asset stubs. */
const kbnResolvePlugin = () => ({
  name: 'kbn-vitest-resolve',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    // Never swap a Node builtin for a same-named npm polyfill (`buffer`, `events`, ...) in the
    // client environment Vitest uses for jsdom; the Jest resolver preferred builtins too.
    if (!source.startsWith('node:') && isBuiltin(source)) {
      return { id: `node:${source}`, external: true };
    }
    if (source === '@elastic/eui' || source.startsWith('@elastic/eui/lib/')) {
      const target =
        source === '@elastic/eui'
          ? '@elastic/eui/test-env'
          : source.replace('@elastic/eui/lib/', '@elastic/eui/test-env/');
      return this.resolve(target, importer, { ...options, skipSelf: true });
    }
    return getAssetMock(source) ?? null;
  },
  load(id) {
    const [path, query] = id.split('?');
    if (query || path.includes('/node_modules/')) {
      return null;
    }
    const ext = Path.extname(path);
    if (RAW_TEXT_EXT.has(ext)) {
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
});

const kbnSwcPlugin = () => ({
  name: 'kbn-vitest-swc',
  enforce: 'pre',
  async transform(code, id) {
    const [path] = id.split('?');
    if (id.startsWith('\0') || path.includes('/node_modules/') || !SWC_EXT.test(path)) {
      return null;
    }
    const { code: out, map } = await jestTransformer.processAsync(code, path, {
      supportsStaticESM: true,
      config: {},
    });
    return { code: out, map: JSON.parse(map) };
  },
});

/**
 * Vitest runs jsdom in Vite's `client` environment, whose `browser` export conditions pick
 * untranspiled or browser-only builds. It also adds `development` to the conditions it passes to
 * workers for natively loaded packages, so e.g. @emotion/react would load twice (dev and prod
 * builds, separate theme contexts). Jest resolved with Node's rules; use `node` everywhere.
 */
const kbnConditionsPlugin = () => ({
  name: 'kbn-vitest-conditions',
  enforce: 'post',
  configResolved(config) {
    const conditions = ['node'];
    config.resolve.conditions = conditions;
    config.ssr.resolve.conditions = conditions;
    config.ssr.resolve.externalConditions = conditions;
    for (const env of Object.values(config.environments ?? {})) {
      env.resolve.conditions = conditions;
      env.resolve.externalConditions = conditions;
    }
  },
});

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
const TOP_LEVEL_JEST_MOCK = /^([ \t]*)jest\.(mock|unmock)\(/gm;

/**
 * Shared mock helpers in packages still on Jest (e.g. `@kbn/code-editor-mock`) call `jest.mock()`
 * at module level. Rename those statements to `vi.mock()` so Vitest hoists them as Jest did;
 * padded so columns don't move. Test files of migrated packages already use `vi.mock()`.
 */
const kbnJestMockPlugin = () => ({
  name: 'kbn-vitest-jest-mock',
  enforce: 'pre',
  transform(code, id) {
    const [path] = id.split('?');
    if (
      id.startsWith('\0') ||
      path.includes('/node_modules/') ||
      !SWC_EXT.test(path) ||
      TEST_FILE.test(path) ||
      !code.includes('jest.')
    ) {
      return null;
    }
    const rewritten = code.replace(
      TOP_LEVEL_JEST_MOCK,
      (_, indent, api) => `${indent}  vi.${api}(`
    );
    return rewritten === code ? null : { code: rewritten, map: null };
  },
});

/**
 * Vitest caches transformed modules on disk across runs (`fsModuleCache`) but doesn't see what
 * our plugins do; key the cache on everything that changes their output.
 */
const kbnCacheKeyPlugin = () => {
  const hash = Crypto.createHash('sha256');
  for (const file of [
    __filename,
    require.resolve('@kbn/jest/src/transforms/swc'),
    require.resolve('@kbn/peggy'),
  ]) {
    hash.update(Fs.readFileSync(file));
  }
  hash.update(JSON.stringify(getJestSwcConfig('/key.tsx')));
  hash.update(require('@swc/core/package.json').version);
  hash.update(require('@swc/jest/package.json').version);
  hash.update(require('@swc/plugin-emotion/package.json').version);
  hash.update(require('peggy/package.json').version);
  const key = hash.digest('hex');
  return {
    name: 'kbn-vitest-cache-key',
    configureVitest({ defineCacheKeyGenerator }) {
      defineCacheKeyGenerator(() => key);
    },
  };
};

/** Vite plugins that reproduce the @kbn/jest node preset's resolver and transforms. */
const kbnNodePlugins = () => [kbnCacheKeyPlugin(), kbnJestMockPlugin(), kbnResolvePlugin()];

/** Vite plugins that reproduce the @kbn/jest jsdom preset's resolver and transformer. */
const kbnJsdomPlugins = () => [...kbnNodePlugins(), kbnSwcPlugin(), kbnConditionsPlugin()];

module.exports = { kbnNodePlugins, kbnJsdomPlugins };
