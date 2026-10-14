/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBreakdownColumn } from './breakdown';
import type { DataView } from '@kbn/data-views-plugin/common';

const dataView = {
  fields: {
    getByName: (name: string) => {
      switch (name) {
        case '@timestamp':
          return { type: 'date' };
        case 'category':
          return { type: 'string' };
        case 'price':
          return { type: 'number' };
        default:
          return { type: 'string' };
      }
    },
  },
};

test('uses terms when field is a string', () => {
  const column = getBreakdownColumn({
    options: 'category',
    dataView: dataView as unknown as DataView,
  });
  expect(column.operationType).toEqual('terms');
});

test('uses date histogram when field is a date', () => {
  const column = getBreakdownColumn({
    options: '@timestamp',
    dataView: dataView as unknown as DataView,
  });
  expect(column.operationType).toEqual('date_histogram');
});

test('uses intervals when field is a number', () => {
  const column = getBreakdownColumn({
    options: 'price',
    dataView: dataView as unknown as DataView,
  });
  expect(column.operationType).toEqual('range');
});

test('forwards secondaryFields and orderBy for topValues breakdown', () => {
  const column = getBreakdownColumn({
    options: {
      type: 'topValues',
      field: 'host.name',
      size: 3,
      secondaryFields: ['container.id', 'service.name'],
      accuracyMode: false,
      orderBy: {
        orderDirection: 'desc',
        orderBy: { type: 'alphabetical', fallback: false },
      },
    },
    dataView: dataView as unknown as DataView,
  });

  expect(column.operationType).toEqual('terms');
  expect(column).toMatchObject({
    sourceField: 'host.name',
    params: {
      size: 3,
      secondaryFields: ['container.id', 'service.name'],
      accuracyMode: false,
      orderDirection: 'desc',
      orderBy: { type: 'alphabetical', fallback: false },
    },
  });
});

test('forwards more than Lens UI MAX_MULTI_FIELDS_SIZE secondary fields', () => {
  // Lens interactive editor caps secondary fields at 3 (4 fields total).
  // Programmatic config builder is not subject to that UI-only gate.
  const secondaryFields = ['container.id', 'event.module', 'labels.groupId', 'labels.scenario'];
  expect(secondaryFields.length).toBeGreaterThan(3);

  const column = getBreakdownColumn({
    options: {
      type: 'topValues',
      field: 'host.name',
      size: 3,
      secondaryFields,
      accuracyMode: false,
    },
    dataView: dataView as unknown as DataView,
  });

  expect(column).toMatchObject({
    sourceField: 'host.name',
    params: {
      secondaryFields,
      size: 3,
      accuracyMode: false,
    },
  });
});
