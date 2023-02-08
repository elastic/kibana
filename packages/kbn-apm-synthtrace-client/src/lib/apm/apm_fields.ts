/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';

export type ApmApplicationMetricFields = Partial<{
  'system.process.memory.size': number;
  'system.memory.actual.free': number;
  'system.memory.total': number;
  'system.cpu.total.norm.pct': number;
  'system.process.memory.rss.bytes': number;
  'system.process.cpu.total.norm.pct': number;
  'jvm.memory.heap.used': number;
  'jvm.memory.non_heap.used': number;
  'jvm.thread.count': number;
  'faas.billed_duration': number;
  'faas.timeout': number;
  'faas.coldstart_duration': number;
  'faas.duration': number;
}>;

export type ApmUserAgentFields = Partial<{
  'user_agent.original': string;
  'user_agent.os.name': string;
  'user_agent.name': string;
  'user_agent.device.name': string;
  'user_agent.version': number;
}>;

export interface ApmException {
  message: string;
}
export interface Observer {
  type: string;
  version: string;
  version_major: number;
}

export interface GeoLocation {
  coordinates: number[];
  type: string;
}

type ExperimentalFields = Partial<{
  'metricset.interval': string;
  'transaction.duration.summary': string;
}>;

export type ApmFields = Fields<{
  'metricset.id': string;
}> &
  Partial<{
    'timestamp.us'?: number;

    'agent.name': string;
    'agent.version': string;
    'client.geo.city_name': string;
    'client.geo.continent_name': string;
    'client.geo.country_iso_code': string;
    'client.geo.country_name': string;
    'client.geo.location': GeoLocation;
    'client.geo.region_iso_code': string;
    'client.geo.region_name': string;
    'client.ip': string;
    'cloud.account.id': string;
    'cloud.account.name': string;
    'cloud.availability_zone': string;
    'cloud.machine.type': string;
    'cloud.project.id': string;
    'cloud.project.name': string;
    'cloud.provider': string;
    'cloud.region': string;
    'cloud.service.name': string;
    'container.id': string;
    'destination.address': string;
    'destination.port': number;
    'device.id': string;
    'device.manufacturer': string;
    'device.model.identifier': string;
    'device.model.name': string;
    'ecs.version': string;
    'error.exception': ApmException[];
    'error.grouping_key': string;
    'error.grouping_name': string;
    'error.id': string;
    'event.ingested': number;
    'event.name': string;
    'event.outcome': string;
    'event.outcome_numeric':
      | number
      | {
          sum: number;
          value_count: number;
        };
    'faas.coldstart': boolean;
    'faas.execution': string;
    'faas.id': string;
    'faas.name': string;
    'faas.trigger.type': string;
    'faas.version': string;
    'host.architecture': string;
    'host.hostname': string;
    'host.name': string;
    'host.os.full': string;
    'host.os.name': string;
    'host.os.platform': string;
    'host.os.type': string;
    'host.os.version': string;
    'http.request.method': string;
    'http.response.status_code': number;
    'kubernetes.pod.name': string;
    'kubernetes.pod.uid': string;
    'labels.name': string;
    'metricset.name': string;
    'network.carrier.icc': string;
    'network.carrier.mcc': string;
    'network.carrier.mnc': string;
    'network.carrier.name': string;
    'network.connection.subtype': string;
    'network.connection.type': string;
    'observer.type': string;
    'observer.version_major': number;
    'observer.version': string;
    'parent.id': string;
    'processor.event': string;
    'processor.name': string;
    'session.id': string;
    'trace.id': string;
    'transaction.aggregation.overflow_count': number;
    'transaction.duration.us': number;
    'transaction.id': string;
    'transaction.name': string;
    'transaction.type': string;
    'transaction.duration.histogram': {
      values: number[];
      counts: number[];
    };
    'service.environment': string;
    'service.framework.name': string;
    'service.framework.version': string;
    'service.language.name': string;
    'service.language.version': string;
    'service.name': string;
    'service.node.name': string;
    'service.runtime.name': string;
    'service.runtime.version': string;
    'service.target.name': string;
    'service.target.type': string;
    'service.version': string;
    'span.action': string;
    'span.destination.service.resource': string;
    'span.destination.service.response_time.count': number;
    'span.destination.service.response_time.sum.us': number;
    'span.duration.us': number;
    'span.id': string;
    'span.name': string;
    'span.self_time.count': number;
    'span.self_time.sum.us': number;
    'span.subtype': string;
    'span.type': string;
    'transaction.result': string;
    'transaction.sampled': true;
    'span.links': Array<{
      trace: { id: string };
      span: { id: string };
    }>;
    'url.original': string;
  }> &
  ApmApplicationMetricFields &
  ExperimentalFields;

export type SpanParams = {
  spanName: string;
  spanType: string;
  spanSubtype?: string;
} & ApmFields;
