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
import type { ICommandContext } from '../types';
import { Commands } from '../../definitions/keywords';
import { autocomplete } from './autocomplete';
import { columnsAfter } from './columns_after';
import { summary } from './summary';
import { validate } from './validate';

const ipLocationCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
  columnsAfter,
  summary,
};

export const ipLocationCommand = {
  name: Commands.IP_LOCATION,
  methods: ipLocationCommandMethods,
  metadata: {
    preview: true,
    description: i18n.translate('kbn-esql-language.esql.definitions.ipLocationDoc', {
      defaultMessage:
        'Enriches rows with geographic information based on an IP address using a MaxMind or IPinfo database',
    }),
    declaration: 'IP_LOCATION prefix = expression [WITH { option = value [, ...] }]',
    examples: [
      '… | IP_LOCATION geo = client.ip',
      '… | IP_LOCATION geo = client.ip WITH { "properties": ["country_iso_code", "country_name", "location"] }',
    ],
  },
};
