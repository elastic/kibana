const babelJest = require('babel-jest');

module.exports = babelJest.createTransformer({
  presets: [
    require.resolve('@kbn/babel-preset/node_preset')
  ]
});
