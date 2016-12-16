var resolve = require('path').resolve;
var delimiter = require('path').delimiter;
var execFileSync = require('child_process').execFileSync;

module.exports = function (plugin, run, options) {
  var kibanaBins = resolve(plugin.kibanaRoot, 'node_modules/.bin');
  var mochaSetupJs = resolve(plugin.kibanaRoot, 'test/mocha_setup.js');
  options = options || {};

  var cmd = 'mocha';
  var testPaths = (options.files && options.files.length) ? options.files : plugin.serverTestPatterns;
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
