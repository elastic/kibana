module.exports = function (plugin) {
  var resolve = require('path').resolve;
  var execFileSync = require('child_process').execFileSync;

  var mochaSetupJs = resolve(plugin.kibanaRoot, 'test/mocha_setup.js');

  var cmd = 'mocha';
  var args = ['--require', mochaSetupJs, 'server/**/__tests__/**/*.js'];
  execFileSync(cmd, args, {
    cwd: plugin.root,
    stdio: 'inherit'
  });
};
