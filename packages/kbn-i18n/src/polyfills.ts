/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shouldPolyfill as shouldPolyfillPluralRules } from '@formatjs/intl-pluralrules/should-polyfill';
import { shouldPolyfill as shouldPolyfillRelativetimeFormat } from '@formatjs/intl-relativetimeformat/should-polyfill';

// formatJS polyfills docs: https://formatjs.io/docs/polyfills/intl-pluralrules/
export async function polyfillLocale(locale: string) {
  await Promise.all([
    maybePolyfillPluralRules(locale),
    maybePolyfillRelativetimeformatRules(locale),
  ]);
}

async function maybePolyfillPluralRules(locale: string) {
  const unsupportedLocale = shouldPolyfillPluralRules(locale);

  // This locale is supported
  if (!unsupportedLocale) {
    return;
  }

  // Load the polyfill 1st BEFORE loading data
  await import('@formatjs/intl-pluralrules/polyfill-force');
  await import(`@formatjs/intl-pluralrules/locale-data/${unsupportedLocale}`);
}

async function maybePolyfillRelativetimeformatRules(locale: string) {
  const unsupportedLocale = shouldPolyfillRelativetimeFormat(locale);

  // This locale is supported
  if (!unsupportedLocale) {
    return;
  }

  // Load the polyfill 1st BEFORE loading data
  await import('@formatjs/intl-relativetimeformat/polyfill-force');
  await import(`@formatjs/intl-relativetimeformat/locale-data/${unsupportedLocale}`);
}
