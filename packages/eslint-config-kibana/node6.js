const baseRules = require('./rules/base');

module.exports = function(options) {
  return Object.assign(
    {
      env: {
        es6: true,
        node: true,
      },

      rules: baseRules,
    },
    options
  );
};
