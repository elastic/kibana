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

export const shape = () => ({
  name: 'shape',
  aliases: [],
  type: 'shape',
  help: 'Create a shape',
  context: {
    types: ['null'],
  },
  args: {
    shape: {
      types: ['string', 'null'],
      help: 'Pick a shape',
      aliases: ['_'],
      default: 'square',
    },
    fill: {
      types: ['string', 'null'],
      help: 'Valid CSS color string',
      default: 'black',
    },
    border: {
      types: ['string', 'null'],
      aliases: ['stroke'],
      help: 'Valid CSS color string',
    },
    borderWidth: {
      types: ['number', 'null'],
      aliases: ['strokeWidth'],
      help: 'Thickness of the border',
      default: '0',
    },
    maintainAspect: {
      types: ['boolean'],
      help: 'Select true to maintain aspect ratio',
      default: false,
    },
  },
  fn: (context, { shape, fill, border, borderWidth, maintainAspect }) => ({
    type: 'shape',
    shape,
    fill,
    border,
    borderWidth,
    maintainAspect,
  }),
});
