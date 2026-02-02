/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { TYPE_A, TYPE_B, type TypeAAttributes, type TypeBAttributes } from './saved_objects';

export const typeAData: ({ id: string } & TypeAAttributes)[] = [
  {
    id: 'type-a-1',
    name: 'Type A 1',
    myDateField: '2021-01-01T00:00:00.000Z',
  },
  {
    id: 'type-a-2',
    name: 'Type A 2',
    myDateField: '2021-01-02T00:00:00.000Z',
  },
  {
    id: 'type-a-3',
    name: 'Type A 3',
    myDateField: '2021-01-03T00:00:00.000Z',
  },
];

export const typeBData: ({ id: string } & TypeBAttributes)[] = [
  {
    id: 'type-b-1',
    name: 'Type B 1',
    myOtherDateField: '2024-01-01T00:00:00.000Z',
  },
];

/** Designed for single Kibana instances */
export const setupData = once(async function setupData(
  savedObjectsClient: SavedObjectsClientContract
) {
  await Promise.all([
    savedObjectsClient.bulkDelete(
      typeAData.map(({ id }) => ({
        type: TYPE_A,
        id,
      }))
    ),
    savedObjectsClient.bulkDelete(
      typeBData.map(({ id }) => ({
        type: TYPE_B,
        id,
      }))
    ),
  ]);
  await Promise.all([
    savedObjectsClient.bulkCreate(
      typeAData.map(({ id, ...att }) => ({
        type: TYPE_A,
        id,
        attributes: att,
      }))
    ),
    savedObjectsClient.bulkCreate(
      typeBData.map(({ id, ...att }) => ({
        id,
        type: TYPE_B,
        attributes: att,
      }))
    ),
  ]);
});
