// invokes a series_function with the specified arguments
var _ = require('lodash');
var tlConfig = require('../fixtures/tlConfig');
var indexArguments = require('../../../handlers/lib/index_arguments');

module.exports = function invokeSeriesFn(fnDef, args) {
  return Promise.all(args).then(function (args) {
    args.byName = indexArguments(fnDef, args);

    var input = _.cloneDeep(args);

    return Promise.resolve(fnDef.originalFn(args, tlConfig)).then(function (output) {
      var result = {
        output: output,
        input: input
      };
      return result;
    }).catch(function (err) {
      return err;
    });
  });
};
