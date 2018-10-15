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

export const table = () => ({
  name: 'table',
  aliases: [],
  type: 'render',
  help: 'Configure a Data Table element',
  context: {
    types: ['datatable'],
  },
  args: {
    font: {
      types: ['style'],
      default: '{font}',
      help: 'Font style',
    },
    paginate: {
      types: ['boolean'],
      default: true,
      help: 'Show pagination controls. If set to false only the first page will be displayed.',
    },
    perPage: {
      types: ['number'],
      default: 10,
      help: 'Show this many rows per page. You probably want to raise this is disabling pagination',
    },
    showHeader: {
      types: ['boolean'],
      default: true,
      help: 'Show or hide the header row with titles for each column.',
    },
  },
  fn: (context, args) => {
    const { font, paginate, perPage, showHeader } = args;

    return {
      type: 'render',
      as: 'table',
      value: {
        datatable: context,
        font,
        paginate,
        perPage,
        showHeader,
      },
    };
  },
});
