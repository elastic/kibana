/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { SavedObjectsFindResult } from '@kbn/core/server';
import {
  type UsageCountersSavedObjectAttributes,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
} from '@kbn/usage-collection-plugin/server';

import { isSavedObjectOlderThan } from './saved_objects';

export const createMockSavedObjectDoc = (
  updatedAt: moment.Moment,
  id: string,
  namespace?: string
) =>
  ({
    id,
    type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
    ...(namespace && { namespaces: [namespace] }),
    attributes: {
      count: 3,
      counterName: 'testName',
      counterType: 'count',
      domainId: 'testDomain',
      source: 'server',
    },
    references: [],
    updated_at: updatedAt.format(),
    version: 'WzI5LDFd',
    score: 0,
  } as SavedObjectsFindResult<UsageCountersSavedObjectAttributes>);

describe('isSavedObjectOlderThan', () => {
  it(`returns true if doc is older than x days`, () => {
    const numberOfDays = 1;
    const startDate = moment().format();
    const doc = createMockSavedObjectDoc(moment().subtract(2, 'days'), 'some-id');
    const result = isSavedObjectOlderThan({
      numberOfDays,
      startDate,
      doc,
    });
    expect(result).toBe(true);
  });

  it(`returns false if doc is exactly x days old`, () => {
    const numberOfDays = 1;
    const startDate = moment().format();
    const doc = createMockSavedObjectDoc(moment().subtract(1, 'days'), 'some-id');
    const result = isSavedObjectOlderThan({
      numberOfDays,
      startDate,
      doc,
    });
    expect(result).toBe(false);
  });

  it(`returns false if doc is younger than x days`, () => {
    const numberOfDays = 2;
    const startDate = moment().format();
    const doc = createMockSavedObjectDoc(moment().subtract(1, 'days'), 'some-id');
    const result = isSavedObjectOlderThan({
      numberOfDays,
      startDate,
      doc,
    });
    expect(result).toBe(false);
  });
});
