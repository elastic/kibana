/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Table, tableFromJSON } from 'apache-arrow';
import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition } from '../types';

export type ExpressionFunctionDemoArrow = ExpressionFunctionDefinition<
  'demoarrow',
  unknown,
  {
    rows: number;
    type: 'ci' | 'shirts';
  },
  { type: 'arrow'; table: Table }
>;

const countries = ['CN', 'US', 'UK', 'DE', 'US', 'US'];
const projects = ['elasticsearch', 'kibana', 'beats'];
const states = ['start', 'in_progress', 'complete'];
const users = ['user1', 'user2', 'user3', 'user4', 'user5'];

function generateCIRow(time: number) {
  return {
    age: Math.round(Math.random() * 70),
    cost: 20 + Math.random() * 100,
    country: countries[Math.floor(Math.random() * countries.length)],
    price: 63,
    project: projects[Math.floor(Math.random() * projects.length)],
    state: states[Math.floor(Math.random() * states.length)],
    time,
    '@timestamp': time,
    username: users[Math.floor(Math.random() * users.length)],
    percent_uptime: Math.random(),
  };
}

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colors = ['Red', 'Yellow', 'Blue'];
const cut = ['fitted', 'slim'];

function generateShirtsRow() {
  return {
    size: users[Math.floor(Math.random() * users.length)],
    color: users[Math.floor(Math.random() * users.length)],
    price: 10 + Math.random() * 100,
    cut: users[Math.floor(Math.random() * users.length)],
  };
}

export const demoarrow: ExpressionFunctionDemoArrow = {
  name: 'demoarrow',
  args: {
    type: {
      types: ['string'],
      aliases: ['_'],
      help: i18n.translate('expressions.functions.demoarrow.args.typeHelpText', {
        defaultMessage: 'The name of the demo data set to use.',
      }),
      default: 'ci',
      options: ['ci', 'shirts'],
    },
    rows: {
      types: ['number'],
      help: i18n.translate('expressions.functions.demoarrow.args.rowsHelpText', {
        defaultMessage: 'Number of rows to return.',
      }),
      default: 100,
    },
  },
  type: 'arrow',
  help: 'generates sample arrow table',
  fn: (input, args) => {
    const data = [];

    const endDate = Date.now();
    const startDate = endDate - 7 * 24 * 3600 * 1000;
    const interval = (endDate - startDate) / args.rows;
    for (let i = 0; i < args.rows; i++) {
      data.push(args.type === 'ci' ? generateCIRow(startDate + i * interval) : generateShirtsRow());
    }
    const table = tableFromJSON(data);
    return { type: 'arrow', table };
  },
};
