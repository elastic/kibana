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

const sao = require('sao');

const templatePkg = require('../package.json');

const template = {
  fromPath: __dirname,
  configOptions: {
    name: 'Some fancy plugin',
  },
};

function getFileContents(file) {
  return file.contents.toString();
}

function getConfig(file) {
  const contents = getFileContents(file).replace(/\r?\n/gm, '');
  return contents.split('kibana.Plugin(')[1];
}

describe('plugin generator sao integration', () => {
  test('skips files when answering no', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: false,
      generateHack: false,
      generateApi: false,
    });

    expect(res.fileList).not.toContain('public/app.js');
    expect(res.fileList).not.toContain('public/__tests__/index.js');
    expect(res.fileList).not.toContain('public/hack.js');
    expect(res.fileList).not.toContain('server/routes/example.js');
    expect(res.fileList).not.toContain('server/__tests__/index.js');

    const uiExports = getConfig(res.files['index.js']);
    expect(uiExports).not.toContain('app:');
    expect(uiExports).not.toContain('hacks:');
    expect(uiExports).not.toContain('init(server, options)');
    expect(uiExports).not.toContain('registerFeature(');
  });

  it('includes app when answering yes', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateHack: false,
      generateApi: false,
    });

    // check output files
    expect(res.fileList).toContain('public/app.js');
    expect(res.fileList).toContain('public/__tests__/index.js');
    expect(res.fileList).not.toContain('public/hack.js');
    expect(res.fileList).not.toContain('server/routes/example.js');
    expect(res.fileList).not.toContain('server/__tests__/index.js');

    const uiExports = getConfig(res.files['index.js']);
    expect(uiExports).toContain('app:');
    expect(uiExports).toContain('init(server, options)');
    expect(uiExports).toContain('registerFeature(');
    expect(uiExports).not.toContain('hacks:');
  });

  it('includes hack when answering yes', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateHack: true,
      generateApi: false,
    });

    // check output files
    expect(res.fileList).toContain('public/app.js');
    expect(res.fileList).toContain('public/__tests__/index.js');
    expect(res.fileList).toContain('public/hack.js');
    expect(res.fileList).not.toContain('server/routes/example.js');
    expect(res.fileList).not.toContain('server/__tests__/index.js');

    const uiExports = getConfig(res.files['index.js']);
    expect(uiExports).toContain('app:');
    expect(uiExports).toContain('hacks:');
    expect(uiExports).toContain('init(server, options)');
    expect(uiExports).toContain('registerFeature(');
  });

  it('includes server api when answering yes', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateHack: true,
      generateApi: true,
    });

    // check output files
    expect(res.fileList).toContain('public/app.js');
    expect(res.fileList).toContain('public/__tests__/index.js');
    expect(res.fileList).toContain('public/hack.js');
    expect(res.fileList).toContain('server/routes/example.js');
    expect(res.fileList).toContain('server/__tests__/index.js');

    const uiExports = getConfig(res.files['index.js']);
    expect(uiExports).toContain('app:');
    expect(uiExports).toContain('hacks:');
    expect(uiExports).toContain('init(server, options)');
    expect(uiExports).toContain('registerFeature(');
  });

  it('plugin config has correct name and main path', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateHack: true,
      generateApi: true,
    });

    const indexContents = getFileContents(res.files['index.js']);
    const nameLine = indexContents.match('name: (.*)')[1];
    const mainLine = indexContents.match('main: (.*)')[1];

    expect(nameLine).toContain('some_fancy_plugin');
    expect(mainLine).toContain('plugins/some_fancy_plugin/app');
  });

  it('plugin package has correct name', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateHack: true,
      generateApi: true,
    });

    const packageContents = getFileContents(res.files['package.json']);
    const pkg = JSON.parse(packageContents);

    expect(pkg.name).toBe('some_fancy_plugin');
  });

  it('package has version "kibana" with master', async () => {
    const res = await sao.mockPrompt(template, {
      kbnVersion: 'master',
    });

    const packageContents = getFileContents(res.files['package.json']);
    const pkg = JSON.parse(packageContents);

    expect(pkg.kibana.version).toBe('kibana');
  });

  it('package has correct version', async () => {
    const res = await sao.mockPrompt(template, {
      kbnVersion: 'v6.0.0',
    });

    const packageContents = getFileContents(res.files['package.json']);
    const pkg = JSON.parse(packageContents);

    expect(pkg.kibana.version).toBe('v6.0.0');
  });

  it('package has correct templateVersion', async () => {
    const res = await sao.mockPrompt(template, {
      kbnVersion: 'master',
    });

    const packageContents = getFileContents(res.files['package.json']);
    const pkg = JSON.parse(packageContents);

    expect(pkg.kibana.templateVersion).toBe(templatePkg.version);
  });

  it('sample app has correct values', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateHack: true,
      generateApi: true,
    });

    const contents = getFileContents(res.files['public/app.js']);
    const controllerLine = contents.match('setRootController(.*)')[1];

    expect(controllerLine).toContain('someFancyPlugin');
  });

  it('includes dotfiles', async () => {
    const res = await sao.mockPrompt(template);
    expect(res.files['.gitignore']).toBeTruthy();
    expect(res.files['.eslintrc.js']).toBeTruthy();
  });
});
