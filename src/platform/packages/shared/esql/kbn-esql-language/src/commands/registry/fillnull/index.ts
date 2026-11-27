/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ICommand } from '../registry';
import { Commands } from '../../definitions/keywords';
import { autocomplete } from './autocomplete';
import { validate } from './validate';

export const fillNullCommand: ICommand = {
  name: Commands.FILLNULL,
  methods: { autocomplete, validate },
  metadata: {
    docPreserving: true,
    description: i18n.translate('esqlLanguage.commands.fillnull.commandDescription', {
      defaultMessage:
        'Replaces null values in selected columns with a value or a type-appropriate default.',
    }),
    declaration: 'FILLNULL value ON field1[, field2, ...]',
    examples: [
      'FROM employees | FILLNULL "unknown" ON first_name, gender',
      'FROM employees | FILLNULL 0 ON salary_*',
      'FROM employees | FILLNULL DEFAULT ON *',
    ],
    preview: true,
    hidden: true,
  },
};
