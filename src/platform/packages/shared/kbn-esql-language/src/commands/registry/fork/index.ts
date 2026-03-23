/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ICommandMethods } from '../registry';
import { autocomplete } from './autocomplete';
import { columnsAfter } from './columns_after';
import { validate } from './validate';
import { summary } from './summary';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';

const forkCommandMethods: ICommandMethods<ICommandContext> = {
  validate,
  autocomplete,
  columnsAfter,
  summary,
};

export const forkCommand = {
  name: Commands.FORK,
  methods: forkCommandMethods,
  metadata: {
    hidden: false,
    preview: true,
    description: i18n.translate('kbn-esql-language.esql.definitions.forkDoc', {
      defaultMessage: 'Forks the stream.',
    }),
    declaration: 'FORK (<processing_commands>) (<processing_commands>) ... (<processing_commands>)',
    examples: [
      `FROM employees
| FORK (WHERE emp_no == 10001)
  (WHERE emp_no == 10002)
| KEEP emp_no, _fork
| SORT emp_no`,
    ],
    subqueryRestrictions: {
      hideInside: true,
      hideOutside: true,
    },
  },
};
