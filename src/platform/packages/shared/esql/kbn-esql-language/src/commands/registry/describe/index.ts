/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Commands } from '../../definitions/keywords';
import { newLineAndPipeCompleteItems } from '../complete_items';
import type { ICommand } from '../registry';

const columnNames = [
  'name',
  'type',
  'role',
  'field',
  'origin',
  'metric_type',
  'unit',
  'interval',
  'time_zone',
  'description',
];

export const describeCommand: ICommand = {
  name: Commands.DESCRIBE,
  methods: {
    autocomplete: () => Promise.resolve(newLineAndPipeCompleteItems),
    columnsAfter: () => columnNames.map((name) => ({ name, type: 'keyword', userDefined: false })),
    summary: () => ({ newColumns: new Set(columnNames) }),
  },
  metadata: {
    description: i18n.translate('esqlLanguage.commands.describe.commandDescription', {
      defaultMessage: 'Returns one row per input column with its type, origin, and other metadata.',
    }),
    declaration: 'DESCRIBE',
    examples: ['FROM logs | DESCRIBE | KEEP name, type'],
    preview: true,
  },
};
