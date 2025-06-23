/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../../entity';
import type { ApmFields } from '../apm_fields';

export type SpanKind = 'Internal' | 'Server' | 'Client' | 'Consumer' | 'Producer';

interface ErrorAttributes {
  'attributes.exception.message': string;
  'attributes.exception.handled': boolean;
  'attributes.exception.type': string;
  'attributes.error.stack_trace': string;
  'attributes.error.id': string;
  'attributes.error.grouping_key': string;
}

type AttributesKeys = Pick<
  ApmFields,
  | 'timestamp.us'
  | 'metricset.name'
  | 'metricset.interval'
  | 'transaction.id'
  | 'transaction.type'
  | 'transaction.name'
  | 'transaction.duration.us'
  | 'transaction.result'
  | 'transaction.sampled'
  | 'span.id'
  | 'span.name'
  | 'span.type'
  | 'span.subtype'
  | 'span.duration.us'
  | 'span.destination.service.resource'
  | 'service.name'
  | 'service.target.name'
  | 'service.target.type'
  | 'processor.event'
  | 'event.outcome'
  | 'event.name'
  | 'url.full'
>;

type MetricsKeys = Pick<
  ApmFields,
  | 'transaction.duration.histogram'
  | 'span.destination.service.response_time.count'
  | 'span.destination.service.response_time.sum.us'
>;

type ResourceAttributesKeys = Pick<
  ApmFields,
  | 'agent.name'
  | 'agent.version'
  | 'service.name'
  | 'service.node.name'
  | 'host.name'
  | 'container.id'
  | 'cloud.provider'
  | 'cloud.region'
  | 'cloud.availability_zone'
  | 'cloud.service.name'
  | 'cloud.account.id'
  | 'cloud.account.name'
  | 'cloud.project.id'
  | 'cloud.project.name'
  | 'cloud.machine.type'
  | 'faas.coldstart'
  | 'faas.id'
  | 'faas.trigger.type'
  | 'faas.name'
  | 'faas.version'
>;

export type ApmOtelAttributes = {
  [K in keyof AttributesKeys as `attributes.${K}`]: ApmFields[K];
} & ErrorAttributes & {
    'attributes.db.statement': string;
    'attributes.db.system': string;
    'attributes.network.peer.address': string;
    'attributes.network.peer.port': number;
    'attributes.network.type': string;
    'attributes.rpc.grpc.status_code': number;
    'attributes.rpc.method': string;
    'attributes.rpc.service': string;
    'attributes.rpc.system': string;
    'attributes.server.address': string;
    'attributes.server.port': number;
    'attributes.session.id': string;
    'attributes.thread.id': number;
    'attributes.thread.name': string;
    'attributes.service.namespace': string;
    'attributes.http.request.method': string;
    'attributes.http.response.status_code': number;
    'attributes.http.url': string;
    'attributes.span.kind': string;
    'attributes.method': string;
    'attributes.messaging.system': string;
    'attributes.messaging.operation': string;
    'attributes.messaging.destination.name': string;
    'attributes.status.code': number;
    'attributes.url.path': string;
    'attributes.url.scheme': string;
  };

type MetricsAttributes = {
  [K in keyof MetricsKeys as `metrics.${K}`]: ApmFields[K];
} & {
  'metrics.event.success_count': {
    sum: number;
    value_count: number;
  };
  'metrics.transaction.duration.summary': {
    sum: number;
    value_count: number;
  };
};

type ResourceAttributes = {
  [K in keyof ResourceAttributesKeys as `resource.attributes.${K}`]: ApmFields[K];
} & {
  'resource.attributes.deployment.environment': string;
  'resource.attributes.service.namespace': string;
  'resource.attributes.service.instance.id': string;
  'resource.attributes.telemetry.sdk.language': string;
  'resource.attributes.telemetry.sdk.name': string;
  'resource.attributes.telemetry.sdk.version': string;
  'resource.attributes.telemetry.distro.name': string;
  'resource.attributes.telemetry.distro.version': string;
  'resource.attributes.process.runtime.name': string;
  'resource.attributes.process.runtime.version': string;
  'resource.attributes.os.type': string;
  'resource.attributes.os.description': string;
  'resource.attributes.host.arch': string;
  'resource.attributes.k8s.pod.name': string;
};

export type ApmOtelFields = Fields &
  Partial<
    {
      'data_stream.dataset': string;
      'data_stream.namespace': string;
      'data_stream.type': string;
      'resource.dropped_attributes_count': number;
      'resource.schema_url': string;
      'scope.attributes.service.framework.name': string;
      'scope.attributes.service.framework.version': string;
      'scope.dropped_attributes_count': number;
      'scope.name': string;
      name: string;
      parent_span_id: string;
      trace_id: string;
      span_id: string;
      kind: SpanKind;
      dropped_attributes_count: number;
      dropped_events_count: number;
      dropped_links_count: number;
      duration: number;
      links: Array<{
        span_id: string;
        trace_id: string;
      }>;
    } & ApmOtelAttributes &
      MetricsAttributes &
      ResourceAttributes
  >;
