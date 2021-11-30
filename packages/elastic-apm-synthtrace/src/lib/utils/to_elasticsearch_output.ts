/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';
import { dedot } from './dedot';

export interface ElasticsearchOutput {
  _index: string;
  _source: unknown;
  timestamp: number;
}

export function eventsToElasticsearchOutput({
  events,
  writeTarget,
}: {
  events: Fields[];
  writeTarget: string;
}): ElasticsearchOutput[] {
  return events.map((event) => {
    const values = {};

    const timestamp = event['@timestamp']!;

    Object.assign(values, event, {
      '@timestamp': new Date(timestamp).toISOString(),
    });

    const document = {};

    dedot(values, document);

    return {
      _index: writeTarget,
      _source: document,
      timestamp,
    };
  });
}
