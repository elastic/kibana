/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apm, timerange } from '../../index';
import { apmEventsToElasticsearchOutput } from '../../lib/apm/utils/apm_events_to_elasticsearch_output';
import { Scenario } from '../scenario';
import { getCommonServices } from '../utils/get_common_services';
import { getApmWriteTargets } from '../../lib/apm/utils/get_apm_write_targets';

const scenario: Scenario = async ({ target, logLevel, scenarioOpts }) => {
  const { client } = getCommonServices({ target, logLevel });
  const writeTargets = await getApmWriteTargets({ client });

  return {
    generate: ({ from, to }) => {
      const range = timerange(from, to);

      const instanceGo = apm.service('synth-go', 'production', 'go').instance('instance-a');

      const events = range
        .interval('1m')
        .rate(1)
        .flatMap((timestamp) => {
          return instanceGo
            .transaction('Sender')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instanceGo
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .timestamp(timestamp + 50)
                .duration(900)
                .destination('elasticsearch')
                .success()
            )
            .serialize();
        });

      // Use the previous created events to links the new span created below
      const spansToLink = events
        .map((event) => {
          const spanId = event['span.id'];
          return spanId ? { span: { id: spanId }, trace: { id: event['trace.id'] } } : undefined;
        })
        .filter((_) => _) as Array<{ span: { id: string }; trace?: { id: string } }>;

      // Create only one transaction that will link all spans
      const consumerRange = timerange(to, new Date(to + 1 * 60000).getTime());

      const instanceJava = apm.service('synth-java', 'production', 'java').instance('instance-b');

      const linkEvents = consumerRange
        .interval('1m')
        .rate(1)
        .flatMap((timestamp) => {
          return instanceJava
            .transaction('Consumer')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instanceJava
                .span('Span links', 'external')
                .linkSpans(spansToLink)
                .timestamp(timestamp + 50)
                .duration(900)
                .destination('elasticsearch')
                .success()
            )
            .serialize();
        });
      return apmEventsToElasticsearchOutput({ events: [...events, ...linkEvents], writeTargets });
    },
  };
};

export default scenario;
