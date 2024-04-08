/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse, isSelectElement, SelectElement } from '@formatjs/icu-messageformat-parser';
import { ErrorKind } from '@formatjs/icu-messageformat-parser/error';

// @ts-ignore
import { createParserErrorMessage } from './utils';

export function checkEnglishOnly(message: string) {
  return /^[a-z]*$/i.test(message);
}

export function verifySelectFormatElement(element: SelectElement) {
  for (const optionKey of Object.keys(element.options)) {
    if (!checkEnglishOnly(optionKey)) {
      const error = new SyntaxError('EXPECT_SELECT_ARGUMENT_OPTIONS');
      // @ts-expect-error Assign to error object
      error.kind = ErrorKind.EXPECT_SELECT_ARGUMENT_OPTIONS;
      // @ts-expect-error Assign to error object
      error.location = element.location;
      error.message = `English only selector required. selectFormat options must be in english, got ${optionKey}`;
      throw error;
    }
  }
}

export function verifyICUMessage(message: string) {
  try {
    const elements = parse(message, { captureLocation: true });
    for (const element of elements) {
      if (isSelectElement(element)) {
        verifySelectFormatElement(element);
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
      throw new Error(errorWithContext);
    }

    throw error;
  }
}
