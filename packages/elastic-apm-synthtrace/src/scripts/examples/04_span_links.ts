/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact, shuffle } from 'lodash';
import { apm, ApmFields, EntityArrayIterable, timerange } from '../..';
import { generateLongId, generateShortId } from '../../lib/utils/generate_id';
import { Scenario } from '../scenario';

function generateExternalSpanLinks() {
  // randomly creates external span links 0 - 10
  return Array(Math.floor(Math.random() * 11))
    .fill(0)
    .map(() => ({ span: { id: generateLongId() }, trace: { id: generateShortId() } }));
}

function getSpanLinksFromEvents(events: ApmFields[]) {
  return compact(
    events.map((event) => {
      const spanId = event['span.id'];
      return spanId ? { span: { id: spanId }, trace: { id: event['trace.id']! } } : undefined;
    })
  );
}

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ from, to }) => {
      const instanceGo = apm.service('Service A', 'production', 'go').instance('instance-a');
      const serviceAEvents = timerange(
        new Date('2022-04-25T19:00:00.000Z'),
        new Date('2022-04-25T19:01:00.000Z')
      )
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return instanceGo
            .transaction('Transaction A')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instanceGo
                .span('GET /service_A', 'custom')
                .timestamp(timestamp + 50)
                .duration(100)
                .success()
            );
        });

      const serviceAAsArray = serviceAEvents.toArray();
      const serviceALinks = getSpanLinksFromEvents(serviceAAsArray);

      const instanceJava = apm.service('Service B', 'production', 'java').instance('instance-b');
      const serviceBevents = timerange(from, to)
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return instanceJava
            .transaction('Transaction B')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instanceJava
                .span('GET /service_B', 'external')
                .defaults({
                  'span.links': shuffle([...generateExternalSpanLinks(), ...serviceALinks]),
                })
                .timestamp(timestamp + 50)
                .duration(900)
                .success()
            );
        });

      const serviceBAsArray = serviceBevents.toArray();
      const serviceBLinks = getSpanLinksFromEvents(serviceBAsArray);

      const instanceRuby = apm.service('Service C', 'production', 'ruby').instance('instance-c');
      const serviceC = timerange(from, to)
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return instanceRuby
            .transaction('Transaction C')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instanceRuby
                .span('GET /service_C', 'external')
                .defaults({ 'span.links': serviceBLinks })
                .timestamp(timestamp + 50)
                .duration(900)
                .success()
            );
        });

      return new EntityArrayIterable(serviceAAsArray)
        .merge(serviceC)
        .merge(new EntityArrayIterable(serviceBAsArray));
    },
  };
};

export default scenario;
