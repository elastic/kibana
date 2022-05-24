/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import objectHash from 'object-hash';
import { groupBy, pickBy } from 'lodash';
import { ApmFields } from '../apm_fields';
import { createPicker } from '../utils/create_picker';

const instanceFields = [
  'container.*',
  'kubernetes.*',
  'agent.*',
  'process.*',
  'cloud.*',
  'service.*',
  'host.*',
];

const instancePicker = createPicker(instanceFields);

const metricsetPicker = createPicker([
  'transaction.type',
  'transaction.name',
  'span.type',
  'span.subtype',
]);

export function getBreakdownMetrics(events: ApmFields[]) {
  const txWithSpans = groupBy(
    events.filter(
      (event) => event['processor.event'] === 'span' || event['processor.event'] === 'transaction'
    ),
    (event) => event['transaction.id']
  );

  const metricsets: Map<string, ApmFields> = new Map();

  Object.keys(txWithSpans).forEach((transactionId) => {
    const txEvents = txWithSpans[transactionId];
    const transaction = txEvents.find((event) => event['processor.event'] === 'transaction');
    if (transaction === undefined) {
      return;
    }

    const eventsById: Record<string, ApmFields> = {};
    const activityByParentId: Record<string, Array<{ from: number; to: number }>> = {};
    for (const event of txEvents) {
      const id =
        event['processor.event'] === 'transaction' ? event['transaction.id'] : event['span.id'];
      eventsById[id!] = event;

      const parentId = event['parent.id'];

      if (!parentId) {
        continue;
      }

      if (!activityByParentId[parentId]) {
        activityByParentId[parentId] = [];
      }

      const from = event['@timestamp']! * 1000;
      const to =
        from +
        (event['processor.event'] === 'transaction'
          ? event['transaction.duration.us']!
          : event['span.duration.us']!);

      activityByParentId[parentId].push({ from, to });
    }

    // eslint-disable-next-line guard-for-in
    for (const id in eventsById) {
      const event = eventsById[id];
      const activities = activityByParentId[id] || [];

      const timeStart = event['@timestamp']! * 1000;

      let selfTime = 0;
      let lastMeasurement = timeStart;
      const changeTimestamps = [
        ...new Set([
          timeStart,
          ...activities.flatMap((activity) => [activity.from, activity.to]),
          timeStart +
            (event['processor.event'] === 'transaction'
              ? event['transaction.duration.us']!
              : event['span.duration.us']!),
        ]),
      ];

      for (const timestamp of changeTimestamps) {
        const hasActiveChildren = activities.some(
          (activity) => activity.from < timestamp && activity.to >= timestamp
        );

        if (!hasActiveChildren) {
          selfTime += timestamp - lastMeasurement;
        }

        lastMeasurement = timestamp;
      }

      const key = {
        '@timestamp': event['@timestamp']! - (event['@timestamp']! % (30 * 1000)),
        'transaction.type': transaction['transaction.type'],
        'transaction.name': transaction['transaction.name'],
        ...pickBy(event, metricsetPicker),
      };

      const instance = pickBy(event, instancePicker);

      const metricsetId = objectHash(key);

      let metricset = metricsets.get(metricsetId);

      if (!metricset) {
        metricset = {
          ...key,
          ...instance,
          'processor.event': 'metric',
          'processor.name': 'metric',
          'metricset.name': `span_breakdown`,
          'span.self_time.count': 0,
          'span.self_time.sum.us': 0,
        };

        if (event['processor.event'] === 'transaction') {
          metricset['span.type'] = 'app';
        } else {
          metricset['span.type'] = event['span.type'];
          metricset['span.subtype'] = event['span.subtype'];
        }

        metricsets.set(metricsetId, metricset);
      }

      metricset['span.self_time.count']!++;
      metricset['span.self_time.sum.us']! += selfTime;
    }
  });

  return Array.from(metricsets.values());
}
