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

import { repeat } from 'lodash';
import { i18n } from '@kbn/i18n';

const translationConfigs = {
  fieldName: {
    defaultMessage: 'field name',
    key: 'kbnESQuery.kql.errors.fieldNameText',
  },
  value: {
    defaultMessage: 'value',
    key: 'kbnESQuery.kql.errors.valueText',
  },
  literal: {
    defaultMessage: 'literal',
    key: 'kbnESQuery.kql.errors.LiteralText',
  },
  whitespace: {
    defaultMessage: 'whitespace',
    key: 'kbnESQuery.kql.errors.whitespaceText',
  },
};

const endOfInputText = i18n.translate('kbnESQuery.kql.errors.endOfInputText', {
  defaultMessage: 'end of input',
});

export class KQLSyntaxError extends Error {
  constructor(error, expression) {
    const translatedExpectations = error.expected.map((expected) => {
      const translationConfig = translationConfigs[expected.description];
      if (!translationConfig) {
        return expected.description;
      }

      return i18n.translate(translationConfig.key, {
        defaultMessage: translationConfig.defaultMessage,
      });
    });

    const translatedExpectationText = translatedExpectations.join(', ');

    const message = i18n.translate('kbnESQuery.kql.errors.syntaxError', {
      defaultMessage: 'Expected {expectedList} but {foundInput} found.',
      values: {
        expectedList: translatedExpectationText,
        foundInput: error.found ? `"${error.found}"` : endOfInputText
      }
    });

    console.log(message);
    console.log(JSON.stringify(error, null, 2));
    const fullMessage = [
      message,
      expression,
      repeat('-', error.location.start.offset) + '^',
    ].join('\n');

    super(fullMessage);
    this.name = 'KQLSyntaxError';
    this.shortMessage = message;
  }
}
