// invokes a series_function with the specified arguments
var _ = require('lodash');
var indexArguments = require('../../../handlers/lib/index_arguments');

module.exports = function invokeSeriesFn(fnDef, args, tlConfigOverrides) {
  var tlConfig = _.merge(require('../fixtures/tlConfig')(), tlConfigOverrides);

  return Promise.all(args).then(function (args) {
    args.byName = indexArguments(fnDef, args);

    var input = _.cloneDeep(args);

    return Promise.resolve(fnDef.originalFn(args, tlConfig)).then(function (output) {

      var result = {
        output: output,
        input: input
      };
      return result;
    });
  });
};
