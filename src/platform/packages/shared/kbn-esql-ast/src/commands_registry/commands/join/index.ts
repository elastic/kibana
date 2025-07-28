/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ICommandMethods } from '../../registry';
import { autocomplete } from './autocomplete';
import { validate } from './validate';
import type { ICommandContext } from '../../types';

const joinCommandMethods: ICommandMethods<ICommandContext> = {
  validate,
  autocomplete,
};

export const joinCommand = {
  name: 'join',
  methods: joinCommandMethods,
  metadata: {
    types: [
      // TODO: uncomment, when in the future LEFT JOIN and RIGHT JOIN are supported.
      // {
      //   name: 'left',
      //   description: i18n.translate(
      //     'kbn-esql-ast.esql.definitions.joinLeftDoc',
      //     {
      //       defaultMessage:
      //         'Join index with another index, keep only matching documents from the right index',
      //     }
      //   ),
      // },
      // {
      //   name: 'right',
      //   description: i18n.translate(
      //     'kbn-esql-ast.esql.definitions.joinRightDoc',
      //     {
      //       defaultMessage:
      //         'Join index with another index, keep only matching documents from the left index',
      //     }
      //   ),
      // },
      {
        name: 'lookup',
        description: i18n.translate('kbn-esql-ast.esql.definitions.joinLookupDoc', {
          defaultMessage: 'Join with a "lookup" mode index',
        }),
      },
    ],
    description: i18n.translate('kbn-esql-ast.esql.definitions.joinDoc', {
      defaultMessage: 'Join table with another table.',
    }),
    declaration: `LOOKUP JOIN <lookup_index> ON <field_name>`,
    examples: [
      '… | LOOKUP JOIN lookup_index ON join_field',
      // TODO: Uncomment when other join types are implemented
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field',
      // '… | <LEFT | RIGHT | LOOKUP> JOIN index AS alias ON index.field = index2.field, index.field2 = index2.field2',
    ],
  },
};
