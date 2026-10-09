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

    const loaded = requireFromTest(Path.join(server, 'plugin.js'));
    expect(loaded.dir).toBe(Fs.realpathSync(server));
    expect(loaded.service.dir).toBe(Fs.realpathSync(lib));
    expect(loaded.service.file).toBe(Fs.realpathSync(Path.join(lib, 'service.js')));
    expect(loaded.service.top).toEqual({
      marker: 'top-marker',
      dir: Fs.realpathSync(lib),
    });
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
