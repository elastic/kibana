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

import { castProvider } from '@kbn/interpreter/common/interpreter/cast';

export const to = () => ({
  name: 'to',
  aliases: [],
  help: 'Explicitly cast from one type to another.',
  context: {},
  args: {
    type: {
      types: ['string'],
      help: 'A known type',
      aliases: ['_'],
      multi: true,
    },
  },
  fn: (context, args, { types }) => {
    if (!args.type) throw new Error('Must specify a casting type');

    return castProvider(types)(context, args.type);
  },
});
