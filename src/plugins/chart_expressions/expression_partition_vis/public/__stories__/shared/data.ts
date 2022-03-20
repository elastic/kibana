/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RenderValue } from '../../../common/types';

export const data: RenderValue['visData'] = {
  type: 'datatable',
  columns: [
    {
      id: '@timestamp',
      name: '@timestamp',
      meta: {
        type: 'date',
      },
    },
    {
      id: 'time',
      name: 'time',
      meta: {
        type: 'date',
      },
    },
    {
      id: 'cost',
      name: 'cost',
      meta: {
        type: 'number',
      },
    },
    {
      id: 'username',
      name: 'username',
      meta: {
        type: 'string',
      },
    },
    {
      id: 'price',
      name: 'price',
      meta: {
        type: 'number',
      },
    },
    {
      id: 'age',
      name: 'age',
      meta: {
        type: 'number',
      },
    },
    {
      id: 'country',
      name: 'country',
      meta: {
        type: 'string',
      },
    },
    {
      id: 'state',
      name: 'state',
      meta: {
        type: 'string',
      },
    },
    {
      id: 'project',
      name: 'project',
      meta: {
        type: 'string',
      },
    },
    {
      id: 'percent_uptime',
      name: 'percent_uptime',
      meta: {
        type: 'number',
      },
    },
  ],
  rows: [
    {
      age: 63,
      cost: 32.15,
      country: 'US',
      price: 53,
      project: 'elasticsearch',
      state: 'running',
      time: 1546334211208,
      '@timestamp': 1546334211208,
      username: 'aevans2e',
      percent_uptime: 0.83,
    },
    {
      age: 68,
      cost: 20.52,
      country: 'JP',
      price: 33,
      project: 'beats',
      state: 'done',
      time: 1546351551031,
      '@timestamp': 1546351551031,
      username: 'aking2c',
      percent_uptime: 0.9,
    },
    {
      age: 57,
      cost: 21.15,
      country: 'UK',
      price: 59,
      project: 'apm',
      state: 'running',
      time: 1546352631083,
      '@timestamp': 1546352631083,
      username: 'mmoore2o',
      percent_uptime: 0.96,
    },
    {
      age: 73,
      cost: 35.64,
      country: 'CN',
      price: 71,
      project: 'machine-learning',
      state: 'start',
      time: 1546402490956,
      '@timestamp': 1546402490956,
      username: 'wrodriguez1r',
      percent_uptime: 0.61,
    },
    {
      age: 38,
      cost: 27.19,
      country: 'TZ',
      price: 36,
      project: 'kibana',
      state: 'done',
      time: 1546467111351,
      '@timestamp': 1546467111351,
      username: 'wrodriguez1r',
      percent_uptime: 0.72,
    },
    {
      age: 61,
      cost: 49.95,
      country: 'NL',
      price: 65,
      project: 'machine-learning',
      state: 'start',
      time: 1546473771019,
      '@timestamp': 1546473771019,
      username: 'mmoore2o',
      percent_uptime: 0.72,
    },
    {
      age: 53,
      cost: 27.36,
      country: 'JP',
      price: 60,
      project: 'x-pack',
      state: 'running',
      time: 1546482171310,
      '@timestamp': 1546482171310,
      username: 'hcrawford2h',
      percent_uptime: 0.65,
    },
    {
      age: 31,
      cost: 33.77,
      country: 'AZ',
      price: 77,
      project: 'kibana',
      state: 'start',
      time: 1546493451206,
      '@timestamp': 1546493451206,
      username: 'aking2c',
      percent_uptime: 0.92,
    },
    {
      age: 71,
      cost: 20.2,
      country: 'TZ',
      price: 57,
      project: 'swiftype',
      state: 'running',
      time: 1546494651235,
      '@timestamp': 1546494651235,
      username: 'jlawson2p',
      percent_uptime: 0.59,
    },
    {
      age: 54,
      cost: 36.65,
      country: 'TZ',
      price: 72,
      project: 'apm',
      state: 'done',
      time: 1546498431195,
      '@timestamp': 1546498431195,
      username: 'aking2c',
      percent_uptime: 1,
    },
  ],
};
