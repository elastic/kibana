// Unless we are running a prebuilt/distributable version of
// Kibana, automatically transpile typescript to js.
//
// NOTE: It should run before babel.
//
if (!global.__BUILT_WITH_BABEL__) {
  const { resolve } = require('path');
  require('ts-node').register({
    transpileOnly: true,
    cacheDirectory: resolve(__dirname, '../../optimize/.cache/ts-node')
  });
}
