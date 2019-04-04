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

import { i18n } from '@kbn/i18n';

export const visDimension = () => ({
  name: 'visdimension',
  help: i18n.translate('interpreter.function.visDimension.help', {
    defaultMessage: 'Generates visConfig dimension object'
  }),
  type: 'vis_dimension',
  context: {
    types: [
      'kibana_datatable'
    ],
  },
  args: {
    accessor: {
      types: ['string', 'number'],
      aliases: ['_'],
      help: i18n.translate('interpreter.function.visDimension.accessor.help', {
        defaultMessage: 'Column in your dataset to use (either column index or column name)'
      }),
    },
    format: {
      types: ['string'],
      default: 'string'
    },
    formatParams: {
      types: ['string'],
      default: '"{}"',
    }
  },
  fn: (context, args) => {
    const accessor = Number.isInteger(args.accessor) ?
      args.accessor :
      context.columns.find(c => c.id === args.accessor);
    if (accessor === undefined) {
      throw new Error(i18n.translate('interpreter.function.visDimension.error.accessor', {
        defaultMessage: 'Column name provided is invalid'
      }));
    }

    return {
      type: 'vis_dimension',
      accessor: accessor,
      format: {
        id: args.format,
        params: JSON.parse(args.formatParams),
      }
    };
  },
});
