/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { apm, ApmFields, EntityArrayIterable, timerange } from '../..';
import { Scenario } from '../scenario';

function generateExternalSpanLinks() {
  // randomly creates external span links 0 - 10
  return Array(Math.floor(Math.random() * 11))
    .fill(0)
    .map(() => ({ span: { id: uuid.v4() }, trance: { id: uuid() } }));
}
function generateEventsSpanLinks() {
  const range = timerange(
    new Date('2022-04-12T19:00:00.000Z'),
    new Date('2022-04-12T19:05:00.000Z')
  );
  const instanceGo = apm.service('synth-go', 'production', 'go').instance('instance-a');
  const events = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => {
      return instanceGo
        .transaction('Sender')
        .timestamp(timestamp)
        .duration(1000)
        .success()
        .children(
          instanceGo
            .span('external', 'custom')
            .timestamp(timestamp + 50)
            .duration(100)
            .success()
        );
    });

  return events;
}

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ from, to }) => {
      const externalSpanLinks = generateExternalSpanLinks();
      let eventsSpanLinks = generateEventsSpanLinks().toArray();
      if (from > to) eventsSpanLinks = eventsSpanLinks.reverse();

      const spanLinks = eventsSpanLinks
        .map((event) => {
          const spanId = event['span.id'];
          return spanId ? { span: { id: spanId }, trace: { id: event['trace.id'] } } : undefined;
        })
        .filter((_) => _) as Array<{ span: { id: string }; trace?: { id: string } }>;

      const consumerRange = timerange(from, to);
      const instanceJava = apm.service('synth-java', 'production', 'java').instance('instance-b');
      const events = consumerRange
        .interval('1m')
        .rate(1)
        .generator((timestamp) => {
          return instanceJava
            .transaction('Consumer')
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instanceJava
                .span('Span links', 'external')
                .defaults({ 'span.links': [...externalSpanLinks, ...spanLinks] })
                .timestamp(timestamp + 50)
                .duration(900)
                .destination('elasticsearch')
                .success()
            );
        });
      return events.merge(new EntityArrayIterable(eventsSpanLinks));
    },
  };
};

export default scenario;
