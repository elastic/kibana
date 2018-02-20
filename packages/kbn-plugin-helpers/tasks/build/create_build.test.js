const { resolve } = require('path');
const { readdirSync } = require('fs');
const del = require('del');
const createBuild = require('./create_build');

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/create_build_test_plugin');
const PLUGIN = require('../../lib/plugin_config')(PLUGIN_FIXTURE);
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build');
const PLUGIN_BUILD_TARGET = resolve(PLUGIN_BUILD_DIR, 'kibana', PLUGIN.id);

beforeEach(() => del(PLUGIN_BUILD_DIR));
afterEach(() => del(PLUGIN_BUILD_DIR));

describe('creating the build', () => {
  const buildTarget = resolve(PLUGIN.root, 'build');
  const buildVersion = PLUGIN.version;
  const kibanaVersion = PLUGIN.version;
  const buildFiles = PLUGIN.buildSourcePatterns;

  it('removes development properties from package.json', async () => {
    expect(PLUGIN.pkg.scripts).not.toBeUndefined();
    expect(PLUGIN.pkg.devDependencies).not.toBeUndefined();

    await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

    const pkg = require(resolve(PLUGIN_BUILD_TARGET, 'package.json'));
    expect(pkg).not.toHaveProperty('scripts');
    expect(pkg).not.toHaveProperty('devDependencies');
  });

  it('adds build metadata to package.json', async () => {
    expect(PLUGIN.pkg.build).toBeUndefined();

    await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

    const pkg = require(resolve(PLUGIN_BUILD_TARGET, 'package.json'));
    expect(pkg).toHaveProperty('build');
    expect(pkg.build.git).not.toBeUndefined();
    expect(pkg.build.date).not.toBeUndefined();
  });

  describe('skipInstallDependencies = false', () => {
    it('installs node_modules as a part of build', async () => {
      expect(PLUGIN.skipInstallDependencies).toBe(false);

      await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

      expect(readdirSync(resolve(PLUGIN_BUILD_TARGET))).toContain('node_modules');
      expect(readdirSync(resolve(PLUGIN_BUILD_TARGET, 'node_modules'))).toContain('noop3');
    });
  });

  describe('skipInstallDependencies = true', () => {
    // set skipInstallDependencies to true for these tests
    beforeEach(() => PLUGIN.skipInstallDependencies = true);
    // set it back to false after
    afterEach(() => PLUGIN.skipInstallDependencies = false);

    it('does not install node_modules as a part of build', async () => {
      expect(PLUGIN.skipInstallDependencies).toBe(true);

      await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

      expect(readdirSync(resolve(PLUGIN_BUILD_TARGET))).not.toContain('node_modules');
    });
  });
});
