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

export const render = () => ({
  name: 'render',
  aliases: [],
  type: 'render',
  help: 'Render an input as a specific element and set element level options such as styling',
  context: {
    types: ['render'],
  },
  args: {
    as: {
      types: ['string', 'null'],
      help:
        'The element type to use in rendering. You probably want a specialized function instead, such as plot or grid',
    },
    css: {
      types: ['string', 'null'],
      default: '"* > * {}"',
      help: 'Any block of custom CSS to be scoped to this element.',
    },
    containerStyle: {
      types: ['containerStyle', 'null'],
      help: 'Style for the container, including background, border, and opacity',
    },
  },
  fn: (context, args) => {
    return {
      ...context,
      as: args.as || context.as,
      css: args.css,
      containerStyle: args.containerStyle,
    };
  },
});
