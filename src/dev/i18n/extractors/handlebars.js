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

import { formatJSString, checkValuesProperty } from '../utils';
import { createFailError, isFailError } from '../../run';
import { DEFAULT_MESSAGE_KEY, DESCRIPTION_KEY } from '../constants';

const HBS_REGEX = /(?<=\{\{)([\s\S]*?)(?=\}\})/g;
const TOKENS_REGEX = /[^'\s]+|(?:'([^'\\]|\\[\s\S])*')/g;

/**
 * Example: `'{{i18n 'message-id' '{"defaultMessage": "Message text"}'}}'`
 */
export function* extractHandlebarsMessages(buffer, reporter) {
  for (const expression of buffer.toString().match(HBS_REGEX) || []) {
    const tokens = expression.match(TOKENS_REGEX);

    const [functionName, idString, propertiesString] = tokens;

    if (functionName !== 'i18n') {
      continue;
    }

    if (tokens.length !== 3) {
      reporter.report(createFailError(`Wrong number of arguments for handlebars i18n call.`));
      continue;
    }

    if (!idString.startsWith(`'`) || !idString.endsWith(`'`)) {
      reporter.report(createFailError(`Message id should be a string literal.`));
      continue;
    }

    const messageId = formatJSString(idString.slice(1, -1));

    if (!messageId) {
      reporter.report(createFailError(`Empty id argument in Handlebars i18n is not allowed.`));
      continue;
    }

    if (!propertiesString.startsWith(`'`) || !propertiesString.endsWith(`'`)) {
      reporter.report(
        createFailError(
          `Properties string in Handlebars i18n should be a string literal ("${messageId}").`
        )
      );
      continue;
    }

    const properties = JSON.parse(propertiesString.slice(1, -1));

    if (typeof properties.defaultMessage !== 'string') {
      reporter.report(
        createFailError(
          `defaultMessage value in Handlebars i18n should be a string ("${messageId}").`
        )
      );
      continue;
    }

    if (properties[DESCRIPTION_KEY] != null && typeof properties[DESCRIPTION_KEY] !== 'string') {
      reporter.report(
        createFailError(`Description value in Handlebars i18n should be a string ("${messageId}").`)
      );
      continue;
    }

    const message = formatJSString(properties[DEFAULT_MESSAGE_KEY]);
    const description = formatJSString(properties[DESCRIPTION_KEY]);

    if (!message) {
      reporter.report(
        createFailError(`Empty defaultMessage in Handlebars i18n is not allowed ("${messageId}").`)
      );
      continue;
    }

    const valuesObject = properties.values;

    if (valuesObject != null && typeof valuesObject !== 'object') {
      reporter.report(
        createFailError(`"values" value should be an object in Handlebars i18n ("${messageId}").`)
      );
      continue;
    }

    try {
      checkValuesProperty(Object.keys(valuesObject || {}), message, messageId);

      yield [messageId, { message, description }];
    } catch (error) {
      if (!isFailError(error)) {
        throw error;
      }

      reporter.report(error);
    }
  }
}
