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

const name = 'indexPatternFieldScript';

type Input = null;
type Output = Promise<IndexPatternFieldSpec>;

interface Arguments {
  script: string;
  language: string;
}

export const indexPatternFieldScript = (): ExpressionFunctionDefinition<typeof name, Input, Arguments, Output> => ({
  name,
  type: 'index_pattern_field',
  inputTypes: ['null'],
  help: i18n.translate('data.functions.indexPatternField.help', {
    defaultMessage: 'creates an index pattern field configuration',
  }),
  args: {
    script: {
      types: ['string'],
      aliases: ['_'],
      required: true,
      help:  i18n.translate('data.functions.indexPatternFieldScript.script.help', {
        defaultMessage: 'script',
      }),
    },
    language: {
      types: ['string'],
      default: 'lucene',
      aliases: ['lang'],
      help:  i18n.translate('data.functions.indexPatternFieldScript.language.help', {
        defaultMessage: 'script language',
      }),
    },
  },
  async fn(input, args) {
    return args;
  },
});
