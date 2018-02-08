const resolve = require('path').resolve;
const delimiter = require('path').delimiter;
const execFileSync = require('child_process').execFileSync;
const winCmd = require('../../../lib/win_cmd');

module.exports = function (plugin, run, options) {
  options = options || {};
  const kibanaBins = resolve(plugin.kibanaRoot, 'node_modules/.bin');
  const mochaSetupJs = resolve(plugin.kibanaRoot, 'test/mocha_setup.js');
  let testPaths = plugin.serverTestPatterns;

  // allow server test files to be overridden
  if (options.files && options.files.length) {
    testPaths = options.files;
  }

  const fullCmd = resolve(plugin.kibanaRoot, 'node_modules', '.bin', 'mocha');
  const cmd = winCmd(fullCmd);
  const args = ['--require', mochaSetupJs].concat(testPaths);
  const path = `${kibanaBins}${delimiter}${process.env.PATH}`;

  execFileSync(cmd, args, {
    cwd: plugin.root,
    stdio: ['ignore', 1, 2],
    env: Object.assign({}, process.env, {
      PATH: path
    })
  });
};
