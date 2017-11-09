/*eslint-env jest*/
const { resolve } = require('path');
const { statSync } = require('fs');
const del = require('del');
const createBuild = require('./create_build');
const createPackage = require('./create_package');

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/test_plugin');
const PLUGIN = require('../../lib/plugin_config')(PLUGIN_FIXTURE);
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build-custom');

describe('create_build', () => {
  const buildVersion = PLUGIN.version;
  const kibanaVersion = PLUGIN.version;
  const buildFiles = PLUGIN.buildSourcePatterns;
  const packageFile = `${PLUGIN.id}-${buildVersion}.zip`;
  const doBuild = () => createBuild(PLUGIN, PLUGIN_BUILD_DIR, buildVersion, kibanaVersion, buildFiles);

  beforeAll(() => del(PLUGIN_BUILD_DIR).then(doBuild));
  afterAll(() => del(PLUGIN_BUILD_DIR));

  describe('creating the package', function () {
    it('creates zip file in build target path', function () {
      return createPackage(PLUGIN, PLUGIN_BUILD_DIR, buildVersion)
        .then(() => {
          const zipFile = resolve(PLUGIN_BUILD_DIR, packageFile);
          const stats = statSync(zipFile);
          expect(stats.isFile()).toBeTruthy();
        });
    });
  });
});
