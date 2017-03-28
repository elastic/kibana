var resolve = require('path').resolve;
var delimiter = require('path').delimiter;
var execFileSync = require('child_process').execFileSync;
var winCmd = require('../../../lib/win_cmd');

module.exports = function (plugin, run, options) {
  options = options || {};
  var kibanaBins = resolve(plugin.kibanaRoot, 'node_modules/.bin');
  var mochaSetupJs = resolve(plugin.kibanaRoot, 'test/mocha_setup.js');
  var testPaths = plugin.serverTestPatterns;

  // allow server test files to be overridden
  if (options.files && options.files.length) {
    testPaths = options.files;
  }

  var fullCmd = resolve(plugin.kibanaRoot, 'node_modules', '.bin', 'mocha');
  var cmd = winCmd(fullCmd);
  var args = ['--require', mochaSetupJs].concat(testPaths);
  var path = `${kibanaBins}${delimiter}${process.env.PATH}`;

  execFileSync(cmd, args, {
    cwd: plugin.root,
    stdio: ['ignore', 1, 2],
    env: Object.assign({}, process.env, {
      PATH: path
    })
  });
};
