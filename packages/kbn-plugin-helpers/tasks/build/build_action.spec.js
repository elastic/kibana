const resolve = require('path').resolve;
const fs = require('fs');

const del = require('del');

const buildAction = require('./build_action');

const PLUGIN_FIXTURE = resolve(__dirname, '__fixtures__/test_plugin');
const PLUGIN_BUILD_DIR = resolve(PLUGIN_FIXTURE, 'build');
const PLUGIN = require('../../lib/plugin_config')(PLUGIN_FIXTURE);

describe('build_action', () => {
  beforeEach(() => del(PLUGIN_BUILD_DIR));
  afterEach(() => del(PLUGIN_BUILD_DIR));

  it('creates a zip in the build directory', () => {
    return buildAction(PLUGIN).then(() => {
      if (!fs.existsSync(resolve(PLUGIN_BUILD_DIR, PLUGIN.id + '-' + PLUGIN.version + '.zip'))) {
        throw new Error('expected the plugin to build a zip file');
      }
    });
  });
});