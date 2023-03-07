/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pick } from 'lodash';
import { hashKeysOf } from '../../utils/hash';
import { ApmFields } from '../apm_fields';

const KEY_FIELDS: Array<keyof ApmFields> = [
  'container.id',
  'kubernetes.pod.name',
  'kubernetes.pod.uid',
  'agent.name',
  'agent.version',
  'cloud.account.id',
  'cloud.account.name',
  'cloud.availability_zone',
  'cloud.machine.type',
  'cloud.project.id',
  'cloud.project.name',
  'cloud.provider',
  'cloud.region',
  'cloud.service.name',
  'service.name',
  'service.environment',
  'service.framework.name',
  'service.language.name',
  'service.language.version',
  'service.name',
  'service.node.name',
  'service.runtime.name',
  'service.runtime.version',
  'host.architecture',
  'host.hostname',
  'host.name',
  'host.os.platform',
  'transaction.type',
  'transaction.name',
  'span.type',
  'span.subtype',
];

export function getBreakdownMetrics(events: ApmFields[]): ApmFields[] {
  const [transaction] = events;

  const metricsets: Map<string, ApmFields> = new Map();

  const eventsById: Record<string, ApmFields> = {};
  const activityByParentId: Record<string, Array<{ from: number; to: number }>> = {};
  for (const event of events) {
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
    const changeTimestamps = Array.from(
      new Set([
        timeStart,
        ...activities.flatMap((activity) => [activity.from, activity.to]),
        timeStart +
          (event['processor.event'] === 'transaction'
            ? event['transaction.duration.us']!
            : event['span.duration.us']!),
      ])
    );

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
      ...pick(event, KEY_FIELDS),
      'transaction.type': transaction['transaction.type'],
      'transaction.name': transaction['transaction.name'],
    };

    const metricsetId = hashKeysOf(key, KEY_FIELDS);

    let metricset = metricsets.get(metricsetId);

    if (!metricset) {
      metricset = {
        ...key,
        '@timestamp': Math.floor(event['@timestamp']! / (30 * 1000)) * 30 * 1000,
        'processor.event': 'metric',
        'processor.name': 'metric',
        'metricset.name': `span_breakdown`,
        'span.self_time.count': 0,
        'span.self_time.sum.us': 0,
        // store the generated metricset id for performance reasons (used in the breakdown metrics aggregator)
        meta: {
          'metricset.id': metricsetId,
        },
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

  return Array.from(metricsets.values());
}
