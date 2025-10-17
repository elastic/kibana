/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OtelSpan } from './otel_span';
import type { ApmOtelFields, SpanKind } from './apm_otel_fields';
import { ApmOtelError } from './apm_otel_error';
import { Entity } from '../../entity';
import type { HttpMethod } from '../span';
import type { ApmApplicationMetricFields } from '../apm_fields';
import { OtelMetricset } from './apm_otel_metrics';
export class OtelInstance extends Entity<ApmOtelFields> {
  span({
    name,
    kind,
    ...fields
  }: ApmOtelFields & { kind: Extract<SpanKind, 'Internal' | 'Server'> }) {
    return new OtelSpan({
      ...this.fields,
      ...(kind === 'Server'
        ? {
            'attributes.server.address': 'elastic.co',
            'attributes.url.scheme': 'https',
            'attributes.http.response.status_code': 200,
            'attributes.http.request.method': 'GET',
          }
        : {}),
      ...fields,
      kind,
      name,
    });
  }

  httpExitSpan({
    name,
    destinationUrl,
  }: {
    name: string;
    destinationUrl: string;
    method?: HttpMethod;
    statusCode?: number;
  }) {
    const destination = new URL(destinationUrl);

    return new OtelSpan({
      ...this.fields,
      name,
      kind: 'Client',

      // http
      'attributes.http.url': destinationUrl,

      // destination
      'attributes.service.target.name': destination.host,
      'attributes.service.target.type': destination.hostname,
      'attributes.span.destination.service.resource': destination.host,
    });
  }

  dbExitSpan({ name, type, statement }: { name: string; type: string; statement?: string }) {
    return new OtelSpan({
      ...this.fields,
      name,
      kind: 'Client',
      // db
      ...(statement ? { 'attributes.db.statement': statement } : undefined),
      'attributes.db.system': type,

      // destination
      'attributes.span.destination.service.resource': type,
    });
  }

  messagingExitSpan({
    name,
    type,
    operation,
    destination,
  }: {
    name: string;
    type: string;
    destination: string;
    operation: 'publish' | 'receive';
  }) {
    return new OtelSpan({
      ...this.fields,
      name,
      kind: operation === 'publish' ? 'Producer' : 'Consumer',
      // db
      'attributes.messaging.system': type,
      'attributes.messaging.operation': operation,
      'attributes.messaging.destination.name': destination,

      // destination
      'attributes.span.destination.service.resource': `${type}/${operation}`,
    });
  }

  rpcSpan({ name, method, service }: { name: string; method: string; service: string }) {
    return new OtelSpan({
      ...this.fields,
      name,
      kind: 'Server',
      // rpc
      'attributes.rpc.method': method,
      'attributes.rpc.service': service,
    });
  }

  appMetrics(metrics: ApmApplicationMetricFields) {
    return new OtelMetricset<ApmOtelFields>({
      ...this.fields,
      ...metrics,
    });
  }

  error({
    message,
    type,
    stackTrace,
    groupingKey,
  }: {
    message: string;
    type?: string;
    stackTrace?: string;
    groupingKey?: string;
  }) {
    return new ApmOtelError({
      ...this.fields,
      ...(groupingKey ? { 'attributes.error.grouping_key': groupingKey } : {}),
      'attributes.exception.type': type,
      'attributes.exception.message': message,
      'attributes.error.stack_trace': stackTrace,
    });
  }

  containerId(containerId: string) {
    this.fields['resource.attributes.container.id'] = containerId;
    return this;
  }
  podId(podId: string) {
    this.fields['resource.attributes.k8s.pod.name'] = podId;
    return this;
  }

  hostName(hostName: string) {
    this.fields['resource.attributes.host.name'] = hostName;
    return this;
  }
}
