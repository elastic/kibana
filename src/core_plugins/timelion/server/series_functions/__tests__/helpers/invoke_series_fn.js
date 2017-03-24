// invokes a series_function with the specified arguments
import _ from 'lodash';

import indexArguments from '../../../handlers/lib/index_arguments';

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
