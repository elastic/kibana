var resolve = require('path').resolve;
var delimiter = require('path').delimiter;
var execFileSync = require('child_process').execFileSync;

module.exports = function (plugin) {
  var kibanaBins = resolve(plugin.kibanaRoot, 'node_modules/.bin');
  var mochaSetupJs = resolve(plugin.kibanaRoot, 'test/mocha_setup.js');

  var cmd = 'mocha';
  var args = ['--require', mochaSetupJs, 'server/**/__tests__/**/*.js'];
  var path = `${kibanaBins}${delimiter}${process.env.PATH}`;
  execFileSync(cmd, args, {
    cwd: plugin.root,
    stdio: ['ignore', 1, 2],
    env: Object.assign({}, process.env, {
      PATH: path
    })
  });
};
