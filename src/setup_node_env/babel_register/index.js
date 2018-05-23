// unless we are running a prebuilt/distributable version of
// kibana, automatically transpile typescript to js before babel
if (!global.__BUILT_WITH_BABEL__) {
  var resolve = require('path').resolve;
  require('ts-node').register({
    transpileOnly: true,
    cacheDirectory: resolve(__dirname, '../../../optimize/.cache/ts-node')
  });
}

// register and polyfill need to happen in this
// order and in separate files. Checkout each file
// for a much more detailed explanation
require('./register');
require('./polyfill');
