/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StringsShouldBeTranslatedWithI18n } from './rules/strings_should_be_translated_with_i18n';
import { StringsShouldBeTranslatedWithFormattedMessage } from './rules/strings_should_be_translated_with_formatted_message';
import { I18nTranslateShouldStartWithTheRightId } from './rules/i18n_translate_should_start_with_the_right_id';
import { FormattedMessageShouldStartWithTheRightId } from './rules/formatted_message_should_start_with_the_right_id';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-i18n'` to your eslint config to use them
 * @internal
 */
export const rules = {
  strings_should_be_translated_with_i18n: StringsShouldBeTranslatedWithI18n,
  strings_should_be_translated_with_formatted_message:
    StringsShouldBeTranslatedWithFormattedMessage,
  i18n_translate_should_start_with_the_right_id: I18nTranslateShouldStartWithTheRightId,
  formatted_message_should_start_with_the_right_id: FormattedMessageShouldStartWithTheRightId,
};
