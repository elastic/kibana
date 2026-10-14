/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequire } from 'node:module';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { bundlePluginServer } from './bundle_plugin_server';

const requireFromTest = createRequire(__filename);

describe('bundlePluginServer', () => {
  const directories: string[] = [];

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      Fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('inlines the startup graph and keeps lazy requires and packages external', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    const lib = Path.join(server, 'lib');
    Fs.mkdirSync(lib, { recursive: true });

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      [
        '"use strict";',
        'const service = require("./lib/service");',
        'exports.service = service;',
        'exports.dir = __dirname;',
        'exports.fs = require("fs");',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(lib, 'service.js'),
      [
        '/*',
        ' * license',
        ' */',
        '"use strict";',
        'const top = require("./top");',
        'exports.top = top;',
        'exports.dir = __dirname;',
        'exports.file = __filename;',
        'exports.lazy = () => require("./lazy");',
        'exports.workerPath = () => require.resolve("./worker.js");',
        'exports.loadPackage = () => require("@kbn/config-schema");',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(lib, 'top.js'),
      '"use strict";\nexports.marker = "top-marker";\nexports.dir = __dirname;\n'
    );
    Fs.writeFileSync(
      Path.join(lib, 'lazy.js'),
      'module.exports = { marker: "lazy-marker", dir: __dirname };\n'
    );
    Fs.writeFileSync(Path.join(lib, 'worker.js'), 'module.exports = { worker: true };\n');

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    expect(bundle).toContain('top-marker');
    expect(bundle).not.toContain('lazy-marker');
    expect(bundle).toContain('require("@kbn/config-schema")');
    expect(bundle).toContain('require("fs")');
    expect(bundle).toContain('require("./lib/lazy.js")');
    expect(bundle).toContain('require.resolve("./lib/worker.js")');
    expect(Fs.existsSync(Path.join(server, 'plugin.chunk-1.js'))).toBe(false);

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(Fs.realpathSync(loaded.dir)).toBe(Fs.realpathSync(server));
    expect(Fs.realpathSync(loaded.service.dir)).toBe(Fs.realpathSync(lib));
    expect(Fs.realpathSync(loaded.service.file)).toBe(
      Fs.realpathSync(Path.join(lib, 'service.js'))
    );
    expect(loaded.service.top.marker).toBe('top-marker');
    expect(Fs.realpathSync(loaded.service.top.dir)).toBe(Fs.realpathSync(lib));
    expect(loaded.service.lazy().marker).toBe('lazy-marker');
    expect(Fs.realpathSync(loaded.service.lazy().dir)).toBe(Fs.realpathSync(lib));
    expect(Fs.realpathSync(loaded.service.workerPath())).toBe(
      Fs.realpathSync(Path.join(lib, 'worker.js'))
    );
    expect(typeof loaded.fs.readFileSync).toBe('function');
  });

  it('inlines versioned filenames that participate in a require cycle', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    const monitors = Path.join(server, 'migrations', 'monitors');
    Fs.mkdirSync(monitors, { recursive: true });

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      '"use strict";\nmodule.exports = require("./migrations/monitors");\n'
    );
    Fs.writeFileSync(
      Path.join(monitors, 'index.js'),
      [
        '"use strict";',
        'Object.defineProperty(exports, "monitorMigrations", {',
        '  enumerable: true,',
        '  get: function () { return monitorMigrations; }',
        '});',
        'const migration = require("./8.9.0");',
        'const legacy = require("../legacy");',
        'const monitorMigrations = { "8.9.0": migration.migration890 };',
        'exports.legacyType = legacy.TYPE;',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(monitors, '8.9.0.js'),
      [
        '"use strict";',
        'Object.defineProperty(exports, "migration890", {',
        '  enumerable: true,',
        '  get: function () { return migration890; }',
        '});',
        'const legacy = require("../legacy");',
        'const migration890 = function migration890() { return legacy.TYPE; };',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(server, 'migrations', 'legacy.js'),
      '"use strict";\nrequire("./monitors");\nexports.TYPE = "single";\n'
    );

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    expect(bundle).not.toContain('require("./migrations/monitors/8.9.0');
    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(loaded.monitorMigrations['8.9.0']()).toBe('single');
    expect(loaded.legacyType).toBe('single');
  });

  it('leaves modules required from outside the bundle as a single instance', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    Fs.mkdirSync(server, { recursive: true });

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      [
        '"use strict";',
        'exports.priv = require("./private");',
        'exports.hub = require("./hub");',
        'exports.config = require("./config");',
        'exports.loadLazy = () => require("./lazy");',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(server, 'index.js'),
      '"use strict";\nexports.config = require("./config");\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'private.js'),
      '"use strict";\nexports.marker = "private-marker";\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'hub.js'),
      '"use strict";\nexports.helper = require("./helper");\nexports.marker = "hub-marker";\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'helper.js'),
      '"use strict";\nexports.state = { marker: "helper-marker" };\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'config.js'),
      '"use strict";\nexports.state = { marker: "config-marker" };\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'lazy.js'),
      '"use strict";\nexports.hub = require("./hub");\n'
    );

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    expect(bundle).toContain('private-marker');
    expect(bundle).not.toContain('hub-marker');
    expect(bundle).not.toContain('helper-marker');
    expect(bundle).not.toContain('config-marker');

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(loaded.priv.marker).toBe('private-marker');
    expect(loaded.loadLazy().hub).toBe(loaded.hub);
    expect(loaded.hub.helper).toBe(requireFromTest(Path.join(server, 'helper.js')));
    expect(loaded.config).toBe(requireFromTest(Path.join(server, 'index.js')).config);
  });

  it('resolves __dirname from the directory the bundle is loaded from', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    const lib = Path.join(server, 'lib');
    Fs.mkdirSync(lib, { recursive: true });
    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      '"use strict";\nexports.dir = require("./lib/service").dir;\n'
    );
    Fs.writeFileSync(
      Path.join(lib, 'service.js'),
      '/* header *//* still a comment */\n// line comment\n"use strict";\nexports.dir = __dirname;\n'
    );

    await bundlePluginServer(root);

    const moved = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-plugin-bundle-moved-'));
    directories.push(moved);
    Fs.cpSync(root, moved, { recursive: true });

    const bundle = Fs.readFileSync(Path.join(moved, 'server', 'plugin.js'), 'utf8');
    expect(bundle).not.toContain(root);
    const serviceBody = bundle.slice(bundle.indexOf('"server/lib/service.js"'));
    const strictAt = serviceBody.indexOf('"use strict";');
    const filenameAt = serviceBody.indexOf(
      'var __filename2 = require("path").join(__kbnBundleDirname, "lib/service.js")'
    );
    expect(serviceBody.slice(strictAt, filenameAt)).toMatch(/^"use strict";\s*$/);
    const loaded = requireFromTest(Path.join(moved, 'server', 'plugin.js'));
    expect(Fs.realpathSync(loaded.dir)).toBe(Fs.realpathSync(Path.join(moved, 'server', 'lib')));
  });

  it('keeps top-level conditional requires on disk until the branch runs', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    Fs.mkdirSync(server, { recursive: true });

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      [
        '"use strict";',
        'const flag = require("./flag");',
        'exports.flag = flag.state;',
        'exports.flagAgain = process.env.KBN_BUNDLE_FLAG_AGAIN === "1" ? require("./flag").state : null;',
        'exports.heavy = process.env.KBN_BUNDLE_LOAD_HEAVY === "1" ? require("./heavy") : null;',
        'exports.skipped = process.env.KBN_BUNDLE_LOAD_SKIPPED && require("./skipped");',
        'exports.fallback = process.env.KBN_BUNDLE_OR || require("./fallback");',
        'exports.nullish = process.env.KBN_BUNDLE_NULLISH ?? require("./nullish");',
        'switch (process.env.KBN_BUNDLE_SWITCH) {',
        '  case "a":',
        '    exports.switched = require("./case-a");',
        '    break;',
        '  default:',
        '    exports.switched = "default";',
        '}',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(server, 'flag.js'),
      '"use strict";\nexports.state = { marker: "flag-marker" };\n'
    );
    for (const name of ['heavy', 'skipped', 'fallback', 'nullish', 'case-a']) {
      Fs.writeFileSync(
        Path.join(server, `${name}.js`),
        `"use strict";\nexports.marker = "${name}-marker";\n`
      );
    }

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    expect(bundle).toContain('flag-marker');
    for (const name of ['heavy', 'skipped', 'fallback', 'nullish', 'case-a']) {
      expect(bundle).not.toContain(`${name}-marker`);
    }
    expect(bundle).toContain('require("./heavy.js")');
    expect(bundle).toContain('require("./skipped.js")');
    expect(bundle).toContain('require("./case-a.js")');

    process.env.KBN_BUNDLE_FLAG_AGAIN = '1';
    process.env.KBN_BUNDLE_LOAD_HEAVY = '1';
    delete process.env.KBN_BUNDLE_LOAD_SKIPPED;
    delete process.env.KBN_BUNDLE_OR;
    delete process.env.KBN_BUNDLE_NULLISH;
    delete process.env.KBN_BUNDLE_SWITCH;
    try {
      const loaded = requireFromTest(Path.join(server, 'plugin.js'));
      expect(loaded.flag).toBe(loaded.flagAgain);
      expect(loaded.flag.marker).toBe('flag-marker');
      expect(loaded.heavy.marker).toBe('heavy-marker');
      expect(loaded.fallback.marker).toBe('fallback-marker');
      expect(loaded.nullish.marker).toBe('nullish-marker');
      expect(loaded.skipped).toBeFalsy();
      expect(loaded.switched).toBe('default');

      const heavyPath = requireFromTest.resolve(Path.join(server, 'heavy.js'));
      const skippedPath = requireFromTest.resolve(Path.join(server, 'skipped.js'));
      const casePath = requireFromTest.resolve(Path.join(server, 'case-a.js'));
      expect(requireFromTest.cache[heavyPath]?.filename).toBe(heavyPath);
      expect(requireFromTest.cache[skippedPath]).toBeUndefined();
      expect(requireFromTest.cache[casePath]).toBeUndefined();
    } finally {
      delete process.env.KBN_BUNDLE_FLAG_AGAIN;
      delete process.env.KBN_BUNDLE_LOAD_HEAVY;
    }
  });

  it('publishes entry exports onto the object on-disk files capture mid-evaluation', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    const lib = Path.join(server, 'lib');
    Fs.mkdirSync(lib, { recursive: true });

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      [
        '"use strict";',
        'exports.ready = function ready() { return "ready"; };',
        'const inner = require("./lib/inner");',
        'const logger = require("./lib/logger");',
        'Object.defineProperty(exports, "EVENT_LOG_ACTIONS", {',
        '  enumerable: true,',
        '  get: function () { return EVENT_LOG_ACTIONS; }',
        '});',
        'const EVENT_LOG_ACTIONS = { execute: "execute" };',
        'exports.inner = inner;',
        'exports.readActions = logger.readActions;',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(server, 'index.js'),
      '"use strict";\nexports.logger = require("./lib/logger");\n'
    );
    Fs.writeFileSync(
      Path.join(lib, 'inner.js'),
      [
        '"use strict";',
        'const plugin = require("../plugin");',
        'exports.marker = "inner-marker";',
        'exports.actions = () => plugin.EVENT_LOG_ACTIONS;',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(lib, 'logger.js'),
      [
        '"use strict";',
        'const plugin = require("../plugin");',
        'exports.seenDuringLoad = plugin.ready();',
        'exports.readActions = () => plugin.EVENT_LOG_ACTIONS;',
        '',
      ].join('\n')
    );

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    expect(bundle).toContain('inner-marker');
    expect(bundle).toContain('require("./lib/logger.js")');
    expect(bundle).toContain('existing || { exports: {} }');
    expect(bundle).toMatch(/module\.exports = require_[A-Za-z0-9_$]+\(module\);\s*$/);

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(loaded.ready()).toBe('ready');
    expect(requireFromTest(Path.join(lib, 'logger.js')).seenDuringLoad).toBe('ready');
    expect(loaded.EVENT_LOG_ACTIONS).toEqual({ execute: 'execute' });
    expect(loaded.inner.marker).toBe('inner-marker');
    expect(loaded.inner.actions()).toEqual({ execute: 'execute' });
    expect(loaded.readActions()).toEqual({ execute: 'execute' });
    expect(requireFromTest(Path.join(lib, 'logger.js')).readActions()).toEqual({
      execute: 'execute',
    });
  });

  it('keeps one instance when an outside conditional requires an inlined module', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    Fs.mkdirSync(server, { recursive: true });

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      [
        '"use strict";',
        'exports.priv = require("./private");',
        'exports.hub = require("./hub");',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(server, 'index.js'),
      '"use strict";\nif (true) exports.hub = require("./hub");\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'private.js'),
      '"use strict";\nexports.marker = "private-marker";\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'hub.js'),
      '"use strict";\nexports.state = { marker: "hub-marker" };\n'
    );

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    expect(bundle).toContain('private-marker');
    expect(bundle).not.toContain('hub-marker');

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(loaded.hub).toBe(requireFromTest(Path.join(server, 'index.js')).hub);
  });

  it('splits the eager graph into chunks under the large-object threshold', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    const lib = Path.join(server, 'lib');
    Fs.mkdirSync(lib, { recursive: true });
    const pad = 'x'.repeat(70 * 1024);

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      [
        '"use strict";',
        'exports.a = require("./lib/a");',
        'exports.b = require("./lib/b");',
        'exports.shared = require("./lib/shared");',
        'exports.again = process.env.KBN_BUNDLE_AGAIN === "1" ? require("./lib/b") : null;',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(lib, 'a.js'),
      [
        '"use strict";',
        'const order = (globalThis.__kbnBundleOrder = globalThis.__kbnBundleOrder || []);',
        'order.push("a-start");',
        'exports.marker = "a-marker";',
        'exports.shared = require("./shared");',
        'order.push("a-end");',
        'exports.dir = __dirname;',
        `exports.pad = "${pad}";`,
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(lib, 'b.js'),
      [
        '"use strict";',
        'const order = (globalThis.__kbnBundleOrder = globalThis.__kbnBundleOrder || []);',
        'order.push("b");',
        'exports.marker = "b-marker";',
        'exports.shared = require("./shared");',
        'exports.dir = __dirname;',
        `exports.pad = "${pad}";`,
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(lib, 'shared.js'),
      [
        '"use strict";',
        'const order = (globalThis.__kbnBundleOrder = globalThis.__kbnBundleOrder || []);',
        'order.push("shared");',
        'exports.state = { marker: "shared-marker" };',
        '',
      ].join('\n')
    );

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    const chunkPath = Path.join(server, 'plugin.chunk-1.js');
    const chunk = Fs.readFileSync(chunkPath, 'utf8');
    expect(Fs.existsSync(Path.join(server, 'plugin.chunk-2.js'))).toBe(false);
    expect(Fs.existsSync(Path.join(server, 'plugin.bundle.js'))).toBe(false);
    expect(bundle).toContain('a-marker');
    expect(bundle).not.toContain('b-marker');
    expect(bundle).not.toContain('shared-marker');
    expect(bundle).toContain('require("./plugin.chunk-1.js")');
    expect(chunk).toContain('b-marker');
    expect(chunk).toContain('shared-marker');
    expect(bundle.length).toBeLessThan(128 * 1024);
    expect(chunk.length).toBeLessThan(128 * 1024);
    expect(Fs.readFileSync(Path.join(lib, 'a.js'), 'utf8')).toContain('a-marker');

    delete process.env.KBN_BUNDLE_AGAIN;
    const order: string[] = [];
    (globalThis as { __kbnBundleOrder?: string[] }).__kbnBundleOrder = order;
    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(order).toEqual(['a-start', 'shared', 'a-end', 'b']);
    delete (globalThis as { __kbnBundleOrder?: string[] }).__kbnBundleOrder;
    expect(loaded.a.marker).toBe('a-marker');
    expect(loaded.b.marker).toBe('b-marker');
    expect(loaded.a.shared.state).toBe(loaded.shared.state);
    expect(loaded.b.shared.state).toBe(loaded.shared.state);
    expect(loaded.again).toBeNull();
    expect(Fs.realpathSync(loaded.a.dir)).toBe(Fs.realpathSync(lib));
    expect(Fs.realpathSync(loaded.b.dir)).toBe(Fs.realpathSync(lib));

    const moved = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-plugin-bundle-moved-'));
    directories.push(moved);
    Fs.cpSync(root, moved, { recursive: true });
    const movedBundle = Fs.readFileSync(Path.join(moved, 'server', 'plugin.js'), 'utf8');
    const movedChunk = Fs.readFileSync(Path.join(moved, 'server', 'plugin.chunk-1.js'), 'utf8');
    expect(movedBundle).not.toContain(root);
    expect(movedChunk).not.toContain(root);
    const movedLoaded = requireFromTest(Path.join(moved, 'server', 'plugin.js'));
    const movedLib = Path.join(moved, 'server', 'lib');
    expect(Fs.realpathSync(movedLoaded.a.dir)).toBe(Fs.realpathSync(movedLib));
    expect(Fs.realpathSync(movedLoaded.b.dir)).toBe(Fs.realpathSync(movedLib));
    expect(movedLoaded.a.shared.state).toBe(movedLoaded.b.shared.state);
    delete (globalThis as { __kbnBundleOrder?: string[] }).__kbnBundleOrder;
  });

  it('keeps a require cycle together when it exceeds the chunk budget', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    Fs.mkdirSync(server, { recursive: true });
    const pad = 'x'.repeat(70 * 1024);

    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      '"use strict";\nexports.a = require("./a");\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'a.js'),
      [
        '"use strict";',
        'const b = require("./b");',
        'exports.marker = "a-marker";',
        'exports.b = b;',
        `exports.pad = "${pad}";`,
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(server, 'b.js'),
      [
        '"use strict";',
        'const a = require("./a");',
        'exports.marker = "b-marker";',
        'exports.a = a;',
        `exports.pad = "${pad}";`,
        '',
      ].join('\n')
    );

    await bundlePluginServer(root);

    const bundle = Fs.readFileSync(Path.join(server, 'plugin.js'), 'utf8');
    const chunk = Fs.readFileSync(Path.join(server, 'plugin.chunk-1.js'), 'utf8');
    expect(Fs.existsSync(Path.join(server, 'plugin.chunk-2.js'))).toBe(false);
    expect(bundle).not.toContain('a-marker');
    expect(bundle).not.toContain('b-marker');
    expect(chunk).toContain('a-marker');
    expect(chunk).toContain('b-marker');

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(loaded.a.marker).toBe('a-marker');
    expect(loaded.a.b.marker).toBe('b-marker');
    expect(loaded.a.b.a).toBe(loaded.a);
  });

  it('keeps one instance when another package requires a module by name', async () => {
    const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-plugin-bundle-build-'));
    directories.push(root);
    const build = Path.join(root, 'kibana');
    const owner = Path.join(build, 'x-pack', 'plugins', 'owner');
    const consumer = Path.join(build, 'x-pack', 'plugins', 'consumer');
    const ownerServer = Path.join(owner, 'server');
    const consumerServer = Path.join(consumer, 'server');
    Fs.mkdirSync(ownerServer, { recursive: true });
    Fs.mkdirSync(consumerServer, { recursive: true });
    Fs.writeFileSync(Path.join(build, 'package.json'), '{"name":"kibana"}\n');
    Fs.writeFileSync(Path.join(owner, 'package.json'), '{"name":"@kbn/owner-plugin"}\n');
    Fs.writeFileSync(Path.join(consumer, 'package.json'), '{"name":"@kbn/consumer-plugin"}\n');

    Fs.writeFileSync(
      Path.join(ownerServer, 'plugin.js'),
      [
        '"use strict";',
        'exports.token = require("./token");',
        'exports.inner = require("./inner");',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(
      Path.join(ownerServer, 'token.js'),
      '"use strict";\nexports.state = { marker: "token-marker" };\n'
    );
    Fs.writeFileSync(
      Path.join(ownerServer, 'inner.js'),
      '"use strict";\nexports.marker = "inner-marker";\n'
    );
    Fs.writeFileSync(
      Path.join(consumerServer, 'read.js'),
      '"use strict";\nexports.token = require("@kbn/owner-plugin/server/token");\n'
    );

    await bundlePluginServer(owner);

    const bundle = Fs.readFileSync(Path.join(ownerServer, 'plugin.js'), 'utf8');
    expect(bundle).toContain('inner-marker');
    expect(bundle).not.toContain('token-marker');
    expect(bundle).toContain('require("./token.js")');

    const loaded = requireFromTest(Path.join(ownerServer, 'plugin.js'));
    const onDisk = requireFromTest(Path.join(ownerServer, 'token.js'));
    expect(loaded.inner.marker).toBe('inner-marker');
    expect(loaded.token.state).toBe(onDisk.state);
  });

  it('resolves require.resolve against the real file when that file is also inlined', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    const lib = Path.join(server, 'lib');
    Fs.mkdirSync(lib, { recursive: true });
    const worker = Path.join(lib, 'worker.js');
    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      '"use strict";\nexports.runner = require("./lib/runner");\n'
    );
    Fs.writeFileSync(
      Path.join(lib, 'runner.js'),
      [
        '"use strict";',
        'exports.path = require.resolve("./worker.js");',
        'exports.worker = require("./worker");',
        '',
      ].join('\n')
    );
    Fs.writeFileSync(worker, '"use strict";\nexports.marker = "worker-marker";\n');

    await bundlePluginServer(root);

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(Fs.realpathSync(loaded.runner.path)).toBe(Fs.realpathSync(worker));
    expect(loaded.runner.worker.marker).toBe('worker-marker');
  });

  it('keeps browser-evaluated functions free of the esbuild __name helper', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    Fs.mkdirSync(server, { recursive: true });
    Fs.writeFileSync(
      Path.join(server, 'plugin.js'),
      '"use strict";\nexports.run = require("./render").run;\n'
    );
    Fs.writeFileSync(
      Path.join(server, 'render.js'),
      [
        '"use strict";',
        'exports.run = (evaluate) =>',
        '  evaluate({',
        '    fn: async (selector) => {',
        '      function waitForRender(visualization) {',
        '        return visualization;',
        '      }',
        '      return waitForRender(selector);',
        '    },',
        '  });',
        '',
      ].join('\n')
    );

    await bundlePluginServer(root);

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    let fn: ((selector: string) => Promise<string>) | undefined;
    loaded.run(({ fn: evaluateFn }: { fn: (selector: string) => Promise<string> }) => {
      fn = evaluateFn;
    });
    expect(fn).toBeDefined();
    // Puppeteer sends this source to the browser, dropping the bundle's scope.
    expect(fn!.toString()).toContain('function waitForRender');
    expect(fn!.toString()).not.toContain('__name');
  });

  it('leaves a plugin entry with no local files unchanged', async () => {
    const root = makePlugin();
    const server = Path.join(root, 'server');
    Fs.mkdirSync(server, { recursive: true });
    const source = '"use strict";\nexports.value = require("fs").constants.F_OK;\n';
    const entry = Path.join(server, 'plugin.js');
    Fs.writeFileSync(entry, source);

    await bundlePluginServer(root);

    expect(Fs.readFileSync(entry, 'utf8')).toBe(source);
  });

  function makePlugin(): string {
    const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-plugin-bundle-'));
    directories.push(root);
    return root;
  }
});
