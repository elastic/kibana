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

const uriPartsCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  columnsAfter,
  summary,
};

export const uriPartsCommand = {
  name: Commands.URI_PARTS,
  methods: uriPartsCommandMethods,
  metadata: {
    preview: true,
    description: i18n.translate('kbn-esql-language.esql.definitions.uriPartsDoc', {
      defaultMessage: 'Parses a URI string and extracts its components into new columns',
    }),
    declaration: 'URI_PARTS prefix = expression',
    examples: ['… | URI_PARTS parts = url'],
  },
};
