/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { Datatable } from '../../../types';
// import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  column: string;
  row: number;
}

export const getCell = {
  name: 'getCell',
  help: 'getcell function',
  inputTypes: ['datatable'],
  args: {
    column: {
      types: ['string'],
      aliases: ['_', 'c'],
      help: 'help text',
    },
    row: {
      types: ['number'],
      aliases: ['r'],
      help: 'description',
      default: 0,
    },
  },
  fn: (input, args) => {
    const row = input.rows[args.row];

    console.log({ input, args });
    if (!row) {
      throw new Error('no row found');
      // throw errors.rowNotFound(args.row);
    }

    // const { column = input.columns[0].name } = args;
    const value = row[args.column];

    if (typeof value === 'undefined') {
      throw new Error('no column found');

      // throw errors.columnNotFound(column);
    }

    return value;
  },
};
