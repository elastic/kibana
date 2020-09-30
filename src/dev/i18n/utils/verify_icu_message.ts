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

// @ts-ignore
import parser from 'intl-messageformat-parser';
// @ts-ignore
import { createParserErrorMessage, traverseNodes } from './utils';
import { SelectFormatNode } from './intl_types';

export function checkEnglishOnly(message: string) {
  return /^[a-z]*$/i.test(message);
}

export function verifySelectFormatNode(node: SelectFormatNode) {
  if (node.type !== 'selectFormat') {
    throw new parser.SyntaxError(
      'Unable to verify select format icu-syntax',
      'selectFormat',
      node.type,
      node.location
    );
  }

  for (const option of node.options) {
    if (option.type === 'optionalFormatPattern') {
      if (!checkEnglishOnly(option.selector)) {
        throw new parser.SyntaxError(
          'selectFormat Selector must be in english',
          'English only selector',
          option.selector,
          node.location
        );
      }
    }
  }
}

export function verifyICUMessage(message: string) {
  try {
    const results = parser.parse(message);
    for (const node of results.elements) {
      if (node.type === 'argumentElement' && node.format?.type === 'selectFormat') {
        verifySelectFormatNode(node.format);
      }
    }
  } catch (error) {
    if (error.name === 'SyntaxError') {
      const errorWithContext = createParserErrorMessage(message, {
        loc: {
          line: error.location.start.line,
          column: error.location.start.column - 1,
        },
        message: error.message,
      });
      throw errorWithContext;
    }
  }
}
