/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hashKeysOf } from '@kbn/apm-synthtrace-client';
import { identity, noop, pick } from 'lodash';
import { EntityFields } from '@kbn/apm-synthtrace-client/src/lib/entities/entity_fields';
import { createMetricAggregatorFactory } from '../../utils/create_metric_aggregator_factory';

export const createEntityAggregator = createMetricAggregatorFactory<EntityFields>();

const KEY_FIELDS: Array<keyof EntityFields> = [
  'agent.name',
  'data_stream.type',
  'entity.definitionId',
  'entity.definitionVersion',
  'entity.id',
  'entity.identityFields',
  'entity.firstSeenTimestamp',
  'entity.lastSeenTimestamp',
  'entity.metrics',
  'entity.schemaVersion',
  'entity.type',
  'event.ingested',
  'service.name',
  'service.environment',
  'service.language.name',
  'service.runtime.name',
  'service.runtime.version',
  'service.version',
];

export function createEntityLatestAggregator(flushInterval: string) {
  return createEntityAggregator(
    {
      filter: (event) => {
        return event['entity.definitionId'] === 'history';
      },
      getAggregateKey: (event) => {
        const key = hashKeysOf(event, KEY_FIELDS);
        return key;
      },
      flushInterval,
      init: (event) => {
        const set = pick(event, KEY_FIELDS);

        return {
          ...set,
          'entity.definitionId': 'latest',
          'entity.displayName': set['service.name'],
        };
      },
    },
    noop,
    identity
  );
}
