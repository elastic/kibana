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

export const replace = () => ({
  name: 'replace',
  type: 'string',
  help: 'Use a regular expression to replace parts of a string',
  context: {
    types: ['string'],
  },
  args: {
    pattern: {
      aliases: ['_', 'regex'],
      types: ['string'],
      help:
        'The text or pattern of a JavaScript regular expression, eg "[aeiou]". You can use capture groups here.',
    },
    flags: {
      aliases: ['modifiers'],
      types: ['string'],
      help:
        'Specify flags. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp for reference.',
      default: 'g',
    },
    replacement: {
      types: ['string'],
      help:
        'The replacement for the matching parts of string. Capture groups can be accessed by their index, eg $1',
      default: '""',
    },
  },
  fn: (context, args) => context.replace(new RegExp(args.pattern, args.flags), args.replacement),
});
