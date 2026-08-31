/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidationFunc } from '../../hook_form_lib';
import type { ERROR_CODE } from './types';

/**
 * Matches Elasticsearch `MetadataIndexTemplateService#validate(...)` name checks:
 * - must not contain: space, ",", "#", "*"
 * - must not start with "_"
 * - must be lower cased
 */
export const indexTemplateNameField =
  (i18n: any) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args;

    if (typeof value !== 'string') {
      return;
    }

    if (value.includes(' ')) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_TEMPLATE_NAME',
        message: i18n.translate('esUi.forms.fieldValidation.indexTemplateName.spaceError', {
          defaultMessage: 'Name must not contain a space.',
        }),
      };
    }

    if (value.includes(',')) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_TEMPLATE_NAME',
        message: i18n.translate('esUi.forms.fieldValidation.indexTemplateName.commaError', {
          defaultMessage: "Name must not contain a ','.",
        }),
      };
    }

    if (value.includes('#')) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_TEMPLATE_NAME',
        message: i18n.translate('esUi.forms.fieldValidation.indexTemplateName.hashError', {
          defaultMessage: "Name must not contain a '#'.",
        }),
      };
    }

    if (value.includes('*')) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_TEMPLATE_NAME',
        message: i18n.translate('esUi.forms.fieldValidation.indexTemplateName.asteriskError', {
          defaultMessage: "Name must not contain a '*'.",
        }),
      };
    }

    if (value.startsWith('_')) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_TEMPLATE_NAME',
        message: i18n.translate(
          'esUi.forms.fieldValidation.indexTemplateName.startsWithUnderscoreError',
          {
            defaultMessage: "Name must not start with '_'.",
          }
        ),
      };
    }

    if (value.toLowerCase() !== value) {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_TEMPLATE_NAME',
        message: i18n.translate('esUi.forms.fieldValidation.indexTemplateName.lowercaseError', {
          defaultMessage: 'Name must be lower case.',
        }),
      };
    }
  };
