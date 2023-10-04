/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StringsShouldBeTranslatedWithI18n } from './rules/strings_should_be_translated_with_i18n';
import { StringsShouldBeTranslatedWithFormattedMessage } from './rules/strings_should_be_translated_with_formatted_message';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-telemetry'` to your eslint config to use them
 * @internal
 */
export const rules = {
  strings_should_be_translated_with_i18n: StringsShouldBeTranslatedWithI18n,
  strings_should_be_translated_with_formatted_message:
    StringsShouldBeTranslatedWithFormattedMessage,
};
