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

export const all = () => ({
  name: 'all',
  type: 'boolean',
  help: 'Return true if all of the conditions are true',
  args: {
    condition: {
      aliases: ['_'],
      types: ['boolean', 'null'],
      required: true,
      multi: true,
      help: 'One or more conditions to check',
    },
  },
  fn: (context, args) => {
    const conditions = args.condition || [];
    return conditions.every(Boolean);
  },
});
