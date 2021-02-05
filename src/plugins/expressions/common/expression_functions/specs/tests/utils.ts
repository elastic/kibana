/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues } from 'lodash';
import { AnyExpressionFunctionDefinition } from '../../types';
import { ExecutionContext } from '../../../execution/types';
import { Datatable } from '../../../expression_types';

/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 */
export const functionWrapper = (spec: AnyExpressionFunctionDefinition) => {
  const defaultArgs = mapValues(spec.args, (argSpec) => argSpec.default);
  return (
    context: object | null,
    args: Record<string, any> = {},
    handlers: ExecutionContext = {} as ExecutionContext
  ) => spec.fn(context, { ...defaultArgs, ...args }, handlers);
};

const emptyTable: Datatable = {
  type: 'datatable',
  columns: [],
  rows: [],
};

const testTable: Datatable = {
  type: 'datatable',
  columns: [
    {
      id: 'name',
      name: 'name',
      meta: { type: 'string' },
    },
    {
      id: 'time',
      name: 'time',
      meta: { type: 'date' },
    },
    {
      id: 'price',
      name: 'price',
      meta: { type: 'number' },
    },
    {
      id: 'quantity',
      name: 'quantity',
      meta: { type: 'number' },
    },
    {
      id: 'in_stock',
      name: 'in_stock',
      meta: { type: 'boolean' },
    },
  ],
  rows: [
    {
      name: 'product1',
      time: 1517842800950, // 05 Feb 2018 15:00:00 GMT
      price: 605,
      quantity: 100,
      in_stock: true,
    },
    {
      name: 'product1',
      time: 1517929200950, // 06 Feb 2018 15:00:00 GMT
      price: 583,
      quantity: 200,
      in_stock: true,
    },
    {
      name: 'product1',
      time: 1518015600950, // 07 Feb 2018 15:00:00 GMT
      price: 420,
      quantity: 300,
      in_stock: true,
    },
    {
      name: 'product2',
      time: 1517842800950, // 05 Feb 2018 15:00:00 GMT
      price: 216,
      quantity: 350,
      in_stock: false,
    },
    {
      name: 'product2',
      time: 1517929200950, // 06 Feb 2018 15:00:00 GMT
      price: 200,
      quantity: 256,
      in_stock: false,
    },
    {
      name: 'product2',
      time: 1518015600950, // 07 Feb 2018 15:00:00 GMT
      price: 190,
      quantity: 231,
      in_stock: false,
    },
    {
      name: 'product3',
      time: 1517842800950, // 05 Feb 2018 15:00:00 GMT
      price: 67,
      quantity: 240,
      in_stock: true,
    },
    {
      name: 'product4',
      time: 1517842800950, // 05 Feb 2018 15:00:00 GMT
      price: 311,
      quantity: 447,
      in_stock: false,
    },
    {
      name: 'product5',
      time: 1517842800950, // 05 Feb 2018 15:00:00 GMT
      price: 288,
      quantity: 384,
      in_stock: true,
    },
  ],
};

const stringTable: Datatable = {
  type: 'datatable',
  columns: [
    {
      id: 'name',
      name: 'name',
      meta: { type: 'string' },
    },
    {
      id: 'time',
      name: 'time',
      meta: { type: 'string' },
    },
    {
      id: 'price',
      name: 'price',
      meta: { type: 'string' },
    },
    {
      id: 'quantity',
      name: 'quantity',
      meta: { type: 'string' },
    },
    {
      id: 'in_stock',
      name: 'in_stock',
      meta: { type: 'string' },
    },
  ],
  rows: [
    {
      name: 'product1',
      time: '2018-02-05T15:00:00.950Z',
      price: '605',
      quantity: '100',
      in_stock: 'true',
    },
    {
      name: 'product1',
      time: '2018-02-06T15:00:00.950Z',
      price: '583',
      quantity: '200',
      in_stock: 'true',
    },
    {
      name: 'product1',
      time: '2018-02-07T15:00:00.950Z',
      price: '420',
      quantity: '300',
      in_stock: 'true',
    },
    {
      name: 'product2',
      time: '2018-02-05T15:00:00.950Z',
      price: '216',
      quantity: '350',
      in_stock: 'false',
    },
    {
      name: 'product2',
      time: '2018-02-06T15:00:00.950Z',
      price: '200',
      quantity: '256',
      in_stock: 'false',
    },
    {
      name: 'product2',
      time: '2018-02-07T15:00:00.950Z',
      price: '190',
      quantity: '231',
      in_stock: 'false',
    },
    {
      name: 'product3',
      time: '2018-02-05T15:00:00.950Z',
      price: '67',
      quantity: '240',
      in_stock: 'true',
    },
    {
      name: 'product4',
      time: '2018-02-05T15:00:00.950Z',
      price: '311',
      quantity: '447',
      in_stock: 'false',
    },
    {
      name: 'product5',
      time: '2018-02-05T15:00:00.950Z',
      price: '288',
      quantity: '384',
      in_stock: 'true',
    },
  ],
};

export { emptyTable, testTable, stringTable };
