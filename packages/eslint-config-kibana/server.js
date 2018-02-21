const baseRules = require('./rules/base');
const babelRules = require('./rules/babel');
const importRules = require('./rules/import');
const objectSpreadRules = require('./rules/object_spread');

module.exports = function(options) {
  return Object.assign(
    {
      plugins: ['babel', 'import', 'prefer-object-spread'],

      env: {
        es6: true,
        node: true,
      },

      rules: Object.assign(
        {},
        baseRules,
        babelRules,
        importRules,
        objectSpreadRules
      ),
    },
    options
  );
};
