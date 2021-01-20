/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

declare module 'intl-format-cache' {
  import IntlMessageFormat from 'intl-messageformat';

  interface Message {
    format: (values: Record<string, string | number | boolean | Date | null | undefined>) => string;
  }

  function memoizeIntlConstructor(
    IntlMessageFormatCtor: typeof IntlMessageFormat
  ): (msg: string, locale: string, formats: any) => Message;

  export = memoizeIntlConstructor;
}
