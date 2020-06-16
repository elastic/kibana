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
import { ExpressionFunctionDefinition } from '../../../../expressions/common/expression_functions';

const name = 'indexPatternCreate';

type Input = null;
type Output = Promise<IndexPatternSpec>;

interface Arguments {
  id: string;
  title: string;
  timeFieldName?: string;
  field: IndexPatternFieldSpec[];
}

export const indexPatternCreate = (): ExpressionFunctionDefinition<typeof name, Input, Arguments, Output> => ({
  name,
  type: 'index_pattern',
  inputTypes: ['null'],
  help: i18n.translate('data.functions.indexPatternCreate.help', {
    defaultMessage: 'creates an index pattern on the fly',
  }),
  args: {
    id: {
      types: ['string'],
      required: true,
      help:  i18n.translate('data.functions.indexPatternCreate.id.help', {
        defaultMessage: 'index pattern id',
      }),
    },
    title: {
      types: ['string'],
      required: true,
      help:  i18n.translate('data.functions.indexPatternCreate.title.help', {
        defaultMessage: 'index pattern title',
      }),
    },
    timeFieldName: {
      types: ['string'],
      help:  i18n.translate('data.functions.indexPatternCreate.timeFieldName.help', {
        defaultMessage: 'index pattern timeFieldName',
      }),
    },
    field: {
      types: ['index_pattern_field'],
      multi: true,
      help:  i18n.translate('data.functions.indexPatternCreate.fieldhelp', {
        defaultMessage: 'index pattern field (use indexPatternField function)',
      }),
    },
  },
  async fn(input, args, { inspectorAdapters, abortSignal }) {
    return args;
  },
});
