const { resolve } = require('path');
const { statSync } = require('fs');
const del = require('del');
const createBuild = require('./create_build');
const createPackage = require('./create_package');

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/create_package_test_plugin');
const PLUGIN = require('../../lib/plugin_config')(PLUGIN_FIXTURE);
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build-custom');

const buildVersion = PLUGIN.version;
const kibanaVersion = PLUGIN.version;
const buildFiles = PLUGIN.buildSourcePatterns;
const packageFile = `${PLUGIN.id}-${buildVersion}.zip`;

beforeAll(() => del(PLUGIN_BUILD_DIR));
afterAll(() => del(PLUGIN_BUILD_DIR));

describe('creating the package', () => {
  it('creates zip file in build target path', async () => {
    await createBuild(PLUGIN, PLUGIN_BUILD_DIR, buildVersion, kibanaVersion, buildFiles);
    await createPackage(PLUGIN, PLUGIN_BUILD_DIR, buildVersion);

    const zipFile = resolve(PLUGIN_BUILD_DIR, packageFile);
    const stats = statSync(zipFile);
    expect(stats.isFile()).toBe(true);
  });
});
