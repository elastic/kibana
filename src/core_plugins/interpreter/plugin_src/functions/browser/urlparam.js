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

import { parse } from 'url';

export const urlparam = () => ({
  name: 'urlparam',
  aliases: [],
  type: 'string',
  help:
    'Access URL parameters and use them in expressions. Eg https://localhost:5601/app/canvas?myVar=20. This will always return a string',
  context: {
    types: ['null'],
  },
  args: {
    param: {
      types: ['string'],
      aliases: ['_', 'var', 'variable'],
      help: 'The URL hash parameter to access',
      multi: false,
    },
    default: {
      types: ['string'],
      default: '""',
      help: 'Return this string if the url parameter is not defined',
    },
  },
  fn: (context, args) => {
    const query = parse(window.location.href, true).query;
    return query[args.param] || args.default;
  },
});
