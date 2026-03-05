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
import { summary } from './summary';
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';

const registeredDomainCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  columnsAfter,
  summary,
};

export const registeredDomainCommand = {
  name: Commands.REGISTERED_DOMAIN,
  methods: registeredDomainCommandMethods,
  metadata: {
    preview: true,
    hidden: true,
    description: i18n.translate('kbn-esql-language.esql.definitions.registeredDomainDoc', {
      defaultMessage:
        'Parses an FQDN string and extracts domain parts into new columns using the public suffix list',
    }),
    declaration: 'REGISTERED_DOMAIN prefix = expression',
    examples: ['… | REGISTERED_DOMAIN parts = host'],
  },
};
