// invokes a series_function with the specified arguments
let _ = require('lodash');
let indexArguments = require('../../../handlers/lib/index_arguments');

module.exports = function invokeSeriesFn(fnDef, args, tlConfigOverrides) {
  let tlConfig = _.merge(require('../fixtures/tlConfig')(), tlConfigOverrides);

  return Promise.all(args).then(function (args) {
    args.byName = indexArguments(fnDef, args);

    let input = _.cloneDeep(args);

    return Promise.resolve(fnDef.originalFn(args, tlConfig)).then(function (output) {

      let result = {
        output: output,
        input: input
      };
      return result;
    });
  });
};
