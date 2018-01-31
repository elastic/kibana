const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
  presets: [
    require.resolve('@elastic/babel-preset-kibana/node')
  ]
});
