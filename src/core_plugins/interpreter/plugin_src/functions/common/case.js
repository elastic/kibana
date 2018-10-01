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

export const caseFn = () => ({
  name: 'case',
  type: 'case',
  help: 'Build a case (including a condition/result) to pass to the switch function.',
  args: {
    when: {
      aliases: ['_'],
      resolve: false,
      help:
        'This value is compared to the context to see if the condition is met. It is overridden by the "if" argument if both are provided.',
    },
    if: {
      types: ['boolean'],
      help:
        'This value is used as whether or not the condition is met. It overrides the unnamed argument if both are provided.',
    },
    then: {
      resolve: false,
      help: 'The value to return if the condition is met',
    },
  },
  fn: async (context, args) => {
    const matches = await doesMatch(context, args);
    const result = matches ? await getResult(context, args) : null;
    return { type: 'case', matches, result };
  },
});

async function doesMatch(context, args) {
  if (typeof args.if !== 'undefined') return args.if;
  if (typeof args.when !== 'undefined') return (await args.when()) === context;
  return true;
}

async function getResult(context, args) {
  if (typeof args.then !== 'undefined') return await args.then();
  return context;
}
