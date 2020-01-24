/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// invokes a series_function with the specified arguments
import _ from 'lodash';

import indexArguments from '../../handlers/lib/index_arguments';

export default function invokeSeriesFn(fnDef, args, tlConfigOverrides) {
  const tlConfig = _.merge(require('../fixtures/tl_config')(), tlConfigOverrides);

  return Promise.all(args).then(function(args) {
    args.byName = indexArguments(fnDef, args);

    const input = _.cloneDeep(args);

    return Promise.resolve(fnDef.originalFn(args, tlConfig)).then(function(output) {
      const result = {
        output: output,
        input: input,
      };
      return result;
    });
  });
}
