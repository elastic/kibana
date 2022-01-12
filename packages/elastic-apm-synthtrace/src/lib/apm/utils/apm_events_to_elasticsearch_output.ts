/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getObserverDefaults } from '../defaults/get_observer_defaults';
import { ApmFields } from '../apm_fields';
import { dedot } from '../../utils/dedot';
import { ElasticsearchOutput } from '../../utils/to_elasticsearch_output';

export interface ApmElasticsearchOutputWriteTargets {
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

dedot(observerDefaults, esDocumentDefaults);

export function apmEventsToElasticsearchOutput({
  events,
  writeTargets,
}: {
  events: ApmFields[];
  writeTargets: ApmElasticsearchOutputWriteTargets;
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

    dedot(values, document);

    return {
      _index: writeTargets[event['processor.event'] as keyof ApmElasticsearchOutputWriteTargets],
      _source: document,
      timestamp: event['@timestamp']!,
    };
  });
}
