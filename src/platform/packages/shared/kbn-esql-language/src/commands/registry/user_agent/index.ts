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
import type { ICommandMethods } from '../registry';
import type { ICommandContext } from '../types';
import { autocomplete } from './autocomplete';
import { columnsAfter } from './columns_after';
import { summary } from './summary';
import { validate } from './validate';

const userAgentCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
  columnsAfter,
  summary,
};

export const userAgentCommand = {
  name: Commands.USER_AGENT,
  methods: userAgentCommandMethods,
  metadata: {
    preview: true,
    description: i18n.translate('kbn-esql-language.esql.definitions.userAgentDoc', {
      defaultMessage:
        'Parses a user-agent string and extracts its components (name, version, OS, device) into new columns',
    }),
    declaration: 'USER_AGENT prefix = expression [WITH { option = value [, ...] }]',
    examples: [
      'ROW ua_str = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15" | USER_AGENT ua = ua_str WITH { "properties": ["name", "version", "device"], "extract_device_type": true } | KEEP ua.*',
    ],
  },
};
