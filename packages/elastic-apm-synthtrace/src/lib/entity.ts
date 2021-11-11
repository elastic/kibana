/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type ApplicationMetricFields = Partial<{
  'system.process.memory.size': number;
  'system.memory.actual.free': number;
  'system.memory.total': number;
  'system.cpu.total.norm.pct': number;
  'system.process.memory.rss.bytes': number;
  'system.process.cpu.total.norm.pct': number;
}>;

export type UserAgentFields = Partial<{
  'user_agent.original': string;
  'user_agent.os.name': string;
  'user_agent.name': string;
  'user_agent.device.name': string;
  'user_agent.version': number;
}>;

export interface Exception {
  message: string;
}

export type Fields = Partial<{
  '@timestamp': number;
  'agent.name': string;
  'agent.version': string;
  'container.id': string;
  'ecs.version': string;
  'event.outcome': string;
  'event.ingested': number;
  'error.id': string;
  'error.exception': Exception[];
  'error.grouping_name': string;
  'error.grouping_key': string;
  'host.name': string;
  'kubernetes.pod.uid': string;
  'metricset.name': string;
  'observer.version': string;
  'observer.version_major': number;
  'parent.id': string;
  'processor.event': string;
  'processor.name': string;
  'trace.id': string;
  'transaction.name': string;
  'transaction.type': string;
  'transaction.id': string;
  'transaction.duration.us': number;
  'transaction.duration.histogram': {
    values: number[];
    counts: number[];
  };
  'transaction.sampled': true;
  'service.name': string;
  'service.environment': string;
  'service.node.name': string;
  'span.id': string;
  'span.name': string;
  'span.type': string;
  'span.subtype': string;
  'span.duration.us': number;
  'span.destination.service.name': string;
  'span.destination.service.resource': string;
  'span.destination.service.type': string;
  'span.destination.service.response_time.sum.us': number;
  'span.destination.service.response_time.count': number;
  'span.self_time.count': number;
  'span.self_time.sum.us': number;
}> &
  ApplicationMetricFields;

export class Entity {
  constructor(public readonly fields: Fields) {
    this.fields = fields;
  }

  defaults(defaults: Fields) {
    Object.keys(defaults).forEach((key) => {
      const fieldName: keyof Fields = key as any;

      if (!(fieldName in this.fields)) {
        this.fields[fieldName] = defaults[fieldName] as any;
      }
    });

    return this;
  }
}
