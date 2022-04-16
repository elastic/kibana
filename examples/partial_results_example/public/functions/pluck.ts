/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin';

export interface PluckArguments {
  key: string;
}

export const pluck: ExpressionFunctionDefinition<'pluck', Datatable, PluckArguments, unknown> = {
  name: 'pluck',
  inputTypes: ['datatable'],
  help: 'Takes a cell from the first table row.',
  args: {
    key: {
      aliases: ['_'],
      types: ['string'],
      help: 'The column id.',
      required: true,
    },
  },
  fn({ rows }, { key }) {
    const [{ [key]: value }] = rows;

    return value;
  },
};
