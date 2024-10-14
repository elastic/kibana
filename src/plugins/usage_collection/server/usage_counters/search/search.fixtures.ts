/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import type { UsageCounters } from '../../../common';
import type { UsageCountersSavedObjectAttributes } from '../saved_objects';

// domainId, counterName, counterType, source, count, namespace?
export type CounterAttributes = [
  string,
  string,
  string,
  UsageCounters.v1.CounterEventSource,
  number,
  string?
];

export const mockedUsageCounters: Array<
  SavedObjectsFindResult<UsageCountersSavedObjectAttributes>
> = [
  toSOFR('2024-07-08T10:00:00.000Z', 'foo', 'bar', 'count', 'server', 28, 'default'),
  toSOFR('2024-07-07T10:00:00.000Z', 'foo', 'bar', 'count', 'server', 27, 'default'),
  toSOFR('2024-07-06T10:00:00.000Z', 'foo', 'bar', 'count', 'server', 26, 'default'),
  toSOFR('2024-07-05T10:00:00.000Z', 'foo', 'bar', 'count', 'server', 25, 'default'),
  toSOFR('2024-07-04T10:00:00.000Z', 'foo', 'bar', 'count', 'server', 24, 'default'),
  toSOFR('2024-07-03T10:00:00.000Z', 'foo', 'bar', 'count', 'server', 23, 'default'),
];

function toSOFR(
  isoDate: string,
  ...attrs: CounterAttributes
): SavedObjectsFindResult<UsageCountersSavedObjectAttributes> {
  const [domainId, counterName, counterType, source, count, namespace] = attrs;
  return {
    id: 'someId',
    type: 'usage-counter',
    ...(namespace && namespace !== 'default' && { namespaces: [namespace[0]] }),
    attributes: {
      domainId,
      counterName,
      counterType,
      source,
      count,
    },
    updated_at: isoDate,
    references: [],
    score: 0,
  };
}
