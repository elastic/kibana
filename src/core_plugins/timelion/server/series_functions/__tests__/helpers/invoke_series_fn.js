// invokes a series_function with the specified arguments
const _ = require('lodash');
const indexArguments = require('../../../handlers/lib/index_arguments');

module.exports = function invokeSeriesFn(fnDef, args, tlConfigOverrides) {
  const tlConfig = _.merge(require('../fixtures/tlConfig')(), tlConfigOverrides);

  return Promise.all(args).then(function (args) {
    args.byName = indexArguments(fnDef, args);

    const input = _.cloneDeep(args);

    return Promise.resolve(fnDef.originalFn(args, tlConfig)).then(function (output) {

      const result = {
        output: output,
        input: input
      };
      return result;
    });
  });
};
