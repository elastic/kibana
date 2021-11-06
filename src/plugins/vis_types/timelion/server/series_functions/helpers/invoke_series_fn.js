/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// invokes a series_function with the specified arguments
import _ from 'lodash';

import indexArguments from '../../handlers/lib/index_arguments';
import tlConfigGenerator from '../fixtures/tl_config';

export default function invokeSeriesFn(fnDef, args, tlConfigOverrides) {
  const tlConfig = _.merge(tlConfigGenerator(), tlConfigOverrides);

  return Promise.all(args).then(function (args) {
    args.byName = indexArguments(fnDef, args);

    const input = _.cloneDeep(args);

    return Promise.resolve(fnDef.originalFn(args, tlConfig)).then(function (output) {
      const result = {
        output: output,
        input: input,
      };
      return result;
    });
  });
}
