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

export type ApmFields = Fields &
  Partial<{
    'timestamp.us'?: number;
    'agent.name': string;
    'agent.version': string;
    'client.geo.city_name': string;
    'client.geo.continent_name': string;
    'client.geo.country_iso_code': string;
    'client.geo.country_name': string;
    'client.geo.region_iso_code': string;
    'client.geo.region_name': string;
    'client.geo.location': GeoLocation;
    'client.ip': string;
    'cloud.provider': string;
    'cloud.project.name': string;
    'cloud.service.name': string;
    'cloud.availability_zone': string;
    'cloud.machine.type': string;
    'cloud.region': string;
    'container.id': string;
    'destination.address': string;
    'destination.port': number;
    'device.id': string;
    'device.model.identifier': string;
    'device.model.name': string;
    'device.manufacturer': string;
    'ecs.version': string;
    'event.outcome': string;
    'event.name': string;
    'event.ingested': number;
    'error.id': string;
    'error.exception': ApmException[];
    'error.grouping_name': string;
    'error.grouping_key': string;
    'faas.id': string;
    'faas.name': string;
    'faas.coldstart': boolean;
    'faas.execution': string;
    'faas.trigger.type': string;
    'faas.trigger.request_id': string;
    'host.name': string;
    'host.architecture': string;
    'host.hostname': string;
    'host.os.full': string;
    'host.os.name': string;
    'host.os.platform': string;
    'host.os.type': string;
    'host.os.version': string;
    'http.request.method': string;
    'http.response.status_code': number;
    'kubernetes.pod.uid': string;
    'kubernetes.pod.name': string;
    'metricset.name': string;
    observer: Observer;
    'network.connection.type': string;
    'network.connection.subtype': string;
    'network.carrier.name': string;
    'network.carrier.mcc': string;
    'network.carrier.mnc': string;
    'network.carrier.icc': string;
    'parent.id': string;
    'processor.event': string;
    'processor.name': string;
    'session.id': string;
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
    'service.version': string;
    'service.environment': string;
    'service.language.name': string;
    'service.node.name': string;
    'service.runtime.name': string;
    'service.runtime.version': string;
    'service.framework.name': string;
    'service.framework.version': string;
    'service.target.name': string;
    'service.target.type': string;
    'span.action': string;
    'span.id': string;
    'span.name': string;
    'span.type': string;
    'span.subtype': string;
    'span.duration.us': number;
    'span.destination.service.resource': string;
    'span.destination.service.response_time.sum.us': number;
    'span.destination.service.response_time.count': number;
    'span.self_time.count': number;
    'span.self_time.sum.us': number;
    'span.links': Array<{
      trace: { id: string };
      span: { id: string };
    }>;
    'url.original': string;
  }> &
  ApmApplicationMetricFields;

export type SpanParams = {
  spanName: string;
  spanType: string;
  spanSubtype?: string;
} & ApmFields;
