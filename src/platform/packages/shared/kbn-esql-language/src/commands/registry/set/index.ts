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
import { validate } from './validate';
import type { ICommandContext } from '../types';
import { settings } from '../../definitions/generated/settings';

const setCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
};

const isHidden = settings.every((setting) => setting.snapshotOnly || setting.ignoreAsSuggestion);

export const setCommand = {
  name: 'set',
  methods: setCommandMethods,
  metadata: {
    type: 'header' as const,
    description: i18n.translate('kbn-esql-language.esql.definitions.setDoc', {
      defaultMessage: 'Sets a query setting',
    }),
    declaration: `SET <setting> = <value>`,
    examples: ['SET project_routing = "_alias:_origin";', 'SET project_routing = "_alias:*";'],
    hidden: isHidden,
    preview: true,
    name: 'set',
  },
};
