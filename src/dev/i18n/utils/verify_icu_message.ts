/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import parser from 'intl-messageformat-parser';
// @ts-ignore
import { createParserErrorMessage } from './utils';
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
