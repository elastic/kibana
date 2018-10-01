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

export const ifFn = () => ({
  name: 'if',
  help: 'Perform conditional logic',
  args: {
    condition: {
      types: ['boolean', 'null'],
      aliases: ['_'],
      help:
        'A boolean true or false, usually returned by a subexpression. If this is not supplied then the input context will be used',
    },
    then: {
      resolve: false,
      help: 'The return value if true',
    },
    else: {
      resolve: false,
      help:
        'The return value if false. If else is not specified, and the condition is false' +
        'then the input context to the function will be returned',
    },
  },
  fn: async (context, args) => {
    if (args.condition) {
      if (typeof args.then === 'undefined') return context;
      return await args.then();
    } else {
      if (typeof args.else === 'undefined') return context;
      return await args.else();
    }
  },
});
