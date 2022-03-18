/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUsageCollectionSetupMock } from '../../plugins/usage_collection/server/mocks';

const { makeUsageCollector } = createUsageCollectionSetupMock();

interface MyObject {
  total: number;
  type: boolean;
}

interface Usage {
  flat?: string;
  my_str?: string;
  my_objects: MyObject;
  my_array?: MyObject[];
  my_str_array?: string[];
  my_index_signature_prop?: {
    [key: string]: number;
  };
}

const SOME_NUMBER: number = 123;

export const myCollector = makeUsageCollector<Usage>({
  type: 'my_working_collector_with_description',
  isReady: () => true,
  fetch() {
    const testString = '123';
    // query ES and get some data

    // summarize the data into a model
    // return the modeled object that includes whatever you want to track
    try {
      return {
        flat: 'hello',
        my_str: testString,
        my_objects: {
          total: SOME_NUMBER,
          type: true,
        },
        my_array: [
          {
            total: SOME_NUMBER,
            type: true,
          },
        ],
        my_str_array: ['hello', 'world'],
      };
    } catch (err) {
      return {
        my_objects: {
          total: 0,
          type: true,
        },
      };
    }
  },
  schema: {
    flat: {
      type: 'keyword',
      _meta: {
        description: 'A flat keyword string',
      },
    },
    my_str: {
      type: 'text',
    },
    my_objects: {
      total: {
        type: 'long',
      },
      type: { type: 'boolean' },
    },
    my_array: {
      type: 'array',
      items: {
        total: {
          type: 'long',
        },
        type: { type: 'boolean' },
      },
    },
    my_str_array: { type: 'array', items: { type: 'keyword' } },
    my_index_signature_prop: {
      count: { type: 'long' },
      avg: { type: 'float' },
      max: { type: 'long' },
      min: { type: 'long' },
    },
  },
});
