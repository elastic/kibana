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

export const switchFn = () => ({
  name: 'switch',
  help: 'Perform conditional logic with multiple conditions',
  args: {
    case: {
      types: ['case'],
      aliases: ['_'],
      resolve: false,
      multi: true,
      help: 'The list of conditions to check',
    },
    default: {
      aliases: ['finally'],
      resolve: false,
      help: 'The default case if no cases match',
    },
  },
  fn: async (context, args) => {
    const cases = args.case || [];
    for (let i = 0; i < cases.length; i++) {
      const { matches, result } = await cases[i]();
      if (matches) return result;
    }
    if (typeof args.default !== 'undefined') return await args.default();
    return context;
  },
});
