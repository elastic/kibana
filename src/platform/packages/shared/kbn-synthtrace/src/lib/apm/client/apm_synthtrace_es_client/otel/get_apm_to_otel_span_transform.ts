/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmFields, ApmOtelFields } from '@kbn/synthtrace-client';
import { Transform } from 'stream';

function moveAttributes(
  obj: Record<string, any>,
  origin: string,
  destination: string,
  ignoreList: Array<keyof ApmFields> = []
) {
  return Object.entries(obj)
    .filter(([key]) => key.startsWith(origin) && !ignoreList.some((item) => key.startsWith(item)))
    .reduce((acc, [key, value]) => {
      acc[`${destination}.${key}`] = value;
      return acc;
    }, {} as Record<string, any>);
}

export function getOtelToApmSpanTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ApmFields, encoding, callback) {
      const links = document['span.links']?.map((p) => ({
        span_id: p.span.id,
        trace_id: p.trace.id,
      }));

      const spanId =
        document['processor.event'] === 'transaction'
          ? document['transaction.id']
          : document['span.id'];

      const spanName =
        document['processor.event'] === 'transaction'
          ? document['transaction.name']
          : document['span.name'];

      const [sdkName, language, distro] = document['agent.name']?.split('/') ?? [];
      const serviceName = document['service.name'];
      const serviceEnvironment = document['service.environment'];

      const otelDoc: ApmOtelFields = {
        ...(document['processor.event'] === 'span'
          ? moveAttributes(document, 'span.', 'attributes', ['span.links'])
          : moveAttributes(document, 'transaction.', 'attributes')),
        ...moveAttributes(document, 'http.', 'attributes'),
        ...moveAttributes(document, 'processor.', 'attributes'),
        ...moveAttributes(document, 'url.', 'attributes'),
        ...moveAttributes(document, 'event.', 'attributes'),
        ...moveAttributes(document, 'timestamp.', 'attributes'),
        ...moveAttributes(document, 'host.', 'resource.attributes'),
        'attributes.error.id': document['error.id'],
        'attributes.error.grouping_key': document['error.grouping_key'],
        'attributes.exception.type': document['error.type'],
        'attributes.exception.message': document['error.exception']
          ?.map((p) => p.message)
          .join(' '),
        'attributes.error.stack_trace':
          document['span.stacktrace']?.join(' ') ?? document['code.stacktrace'],
        'attributes.service.name': serviceName,
        'attributes.service.namespace': serviceEnvironment,
        'resource.attributes.service.name': serviceName,
        'resource.attributes.service.namespace': serviceEnvironment,
        'resource.attributes.service.instance.id': document['service.node.name'],
        'resource.attributes.deployment.environment': serviceEnvironment,
        'resource.attributes.agent.name': document['agent.name'],
        'resource.attributes.telemetry.sdk.name': sdkName,
        'resource.attributes.telemetry.sdk.language': language,
        'resource.attributes.telemetry.distro.name': distro,
        'scope.attributes.service.framework.name': serviceName,
        'scope.name': serviceName,
        '@timestamp': document['@timestamp'],
        kind: document['processor.event'] === 'transaction' ? 'Server' : 'Client',
        parent_span_id: document['parent.id'],
        links,
        trace_id: document['trace.id'],
        span_id: spanId,
        name: spanName,
      };

      callback(null, otelDoc);
    },
  });
}
