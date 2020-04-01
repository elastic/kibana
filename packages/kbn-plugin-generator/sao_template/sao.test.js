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

const template = {
  fromPath: __dirname,
  configOptions: {
    name: 'Some fancy plugin',
    targetPath: '',
  },
};

function getFileContents(file) {
  return file.contents.toString();
}

describe('plugin generator sao integration', () => {
  test('skips files when answering no', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: false,
      generateApi: false,
    });

    expect(res.fileList).toContain('common/index.ts');
    expect(res.fileList).not.toContain('public/index.ts');
    expect(res.fileList).not.toContain('server/index.ts');
  });

  it('includes app when answering yes', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateApi: false,
      generateScss: true,
    });

    // check output files
    expect(res.fileList).toContain('common/index.ts');
    expect(res.fileList).toContain('public/index.ts');
    expect(res.fileList).toContain('public/plugin.ts');
    expect(res.fileList).toContain('public/types.ts');
    expect(res.fileList).toContain('public/components/app.tsx');
    expect(res.fileList).toContain('public/index.scss');
    expect(res.fileList).not.toContain('server/index.ts');
  });

  it('includes server api when answering yes', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateApi: true,
    });

    // check output files
    expect(res.fileList).toContain('public/plugin.ts');
    expect(res.fileList).toContain('server/plugin.ts');
    expect(res.fileList).toContain('server/index.ts');
    expect(res.fileList).toContain('server/types.ts');
    expect(res.fileList).toContain('server/routes/index.ts');
  });

  it('skips eslintrc and scss', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateApi: true,
      generateScss: false,
      generateEslint: false,
    });

    // check output files
    expect(res.fileList).toContain('public/plugin.ts');
    expect(res.fileList).not.toContain('public/index.scss');
    expect(res.fileList).not.toContain('.eslintrc.js');
  });

  it('plugin package has correct title', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateApi: true,
    });

    const contents = getFileContents(res.files['common/index.ts']);
    const controllerLine = contents.match("PLUGIN_NAME = '(.*)'")[1];

    expect(controllerLine).toContain('Some fancy plugin');
  });

  it('package has version "kibana" with master', async () => {
    const res = await sao.mockPrompt(template, {
      kbnVersion: 'master',
    });

    const packageContents = getFileContents(res.files['kibana.json']);
    const pkg = JSON.parse(packageContents);

    expect(pkg.version).toBe('master');
  });

  it('package has correct version', async () => {
    const res = await sao.mockPrompt(template, {
      kbnVersion: 'v6.0.0',
    });

    const packageContents = getFileContents(res.files['kibana.json']);
    const pkg = JSON.parse(packageContents);

    expect(pkg.version).toBe('v6.0.0');
  });

  it('sample app has correct values', async () => {
    const res = await sao.mockPrompt(template, {
      generateApp: true,
      generateApi: true,
    });

    const contents = getFileContents(res.files['common/index.ts']);
    const controllerLine = contents.match("PLUGIN_ID = '(.*)'")[1];

    expect(controllerLine).toContain('someFancyPlugin');
  });

  it('includes dotfiles', async () => {
    const res = await sao.mockPrompt(template);
    expect(res.files['.eslintrc.js']).toBeTruthy();
    expect(res.files['.i18nrc.json']).toBeTruthy();
  });

  it('validaes path override', async () => {
    try {
      await sao.mockPrompt(template, {
        generateApp: true,
        generateApi: true,
        generateScss: false,
        generateEslint: false,
        customPath: 'banana',
      });
    } catch (e) {
      expect(e.message).toContain('Validation failed at prompt "customPath"');
    }
  });
});
