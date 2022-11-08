/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from 'lodash';
import { getObserverDefaults } from '../..';
import { Fields } from '../entity';

export interface ElasticsearchOutput {
  _index: string;
  _source: unknown;
}

export interface ElasticsearchOutputWriteTargets {
  transaction: string;
  span: string;
  error: string;
  metric: string;
}

const observerDefaults = getObserverDefaults();

const esDocumentDefaults = {
  ecs: {
    version: '1.4',
  },
};

// eslint-disable-next-line guard-for-in
for (const key in observerDefaults) {
  set(esDocumentDefaults, key, observerDefaults[key as keyof typeof observerDefaults]);
}
export function toElasticsearchOutput({
  events,
  writeTargets,
}: {
  events: Fields[];
  writeTargets: ElasticsearchOutputWriteTargets;
}): ElasticsearchOutput[] {
  return events.map((event) => {
    const values = {};

    Object.assign(values, event, {
      '@timestamp': new Date(event['@timestamp']!).toISOString(),
      'timestamp.us': event['@timestamp']! * 1000,
      'service.node.name':
        event['service.node.name'] || event['container.id'] || event['host.name'],
    });

    const document = {};

    Object.assign(document, esDocumentDefaults);

    // eslint-disable-next-line guard-for-in
    for (const key in values) {
      const val = values[key as keyof typeof values];
      set(document, key, val);
    }

    return {
      _index: writeTargets[event['processor.event'] as keyof ElasticsearchOutputWriteTargets],
      _source: document,
    };
  });
}
