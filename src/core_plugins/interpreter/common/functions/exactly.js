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

export const exactly = () => ({
  name: 'exactly',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: 'Create a filter that matches a given column for a perfectly exact value',
  args: {
    column: {
      types: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
    value: {
      types: ['string'],
      aliases: ['v', 'val'],
      help: 'The value to match exactly, including white space and capitalization',
    },
  },
  fn: (context, args) => {
    const { value, column } = args;

    const filter = {
      type: 'exactly',
      value,
      column,
    };

    return { ...context, and: [...context.and, filter] };
  },
});
