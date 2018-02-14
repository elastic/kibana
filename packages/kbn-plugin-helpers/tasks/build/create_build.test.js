const { resolve } = require('path');
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
    expect(pkg.scripts).toBeUndefined();
    expect(pkg.devDependencies).toBeUndefined();
  });

  it('adds build metadata to package.json', async () => {
    expect(PLUGIN.pkg.build).toBeUndefined();

    await createBuild(PLUGIN, buildTarget, buildVersion, kibanaVersion, buildFiles);

    const pkg = require(resolve(PLUGIN_BUILD_TARGET, 'package.json'));
    expect(pkg.build).not.toBeUndefined();
    expect(pkg.build.git).not.toBeUndefined();
    expect(pkg.build.date).not.toBeUndefined();
  });
});
