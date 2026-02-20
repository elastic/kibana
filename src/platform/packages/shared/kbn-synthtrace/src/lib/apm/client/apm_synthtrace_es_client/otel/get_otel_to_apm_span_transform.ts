/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApmOtelFields, SpanKind } from '@kbn/synthtrace-client';
import { Transform } from 'stream';

const kindToProcessorEvent: Record<SpanKind, 'transaction' | 'span'> = {
  Internal: 'span',
  Client: 'span',
  Server: 'transaction',
  Consumer: 'transaction',
  Producer: 'span',
};

export function getOtelToApmTransform() {
  return new Transform({
    objectMode: true,
    transform(document: ApmOtelFields, encoding, callback) {
      const { kind, name, duration, span_id: spanId } = document;

      const sdkName = document['resource.attributes.telemetry.sdk.name'];
      const sdkLanguage = document['resource.attributes.telemetry.sdk.language'];
      const distro = document['resource.attributes.telemetry.distro.name'];

      document['resource.attributes.agent.name'] = `${sdkName}/${sdkLanguage}${
        distro ? `/${distro}` : ''
      }`;
      document['attributes.service.name'] = document['resource.attributes.service.name'];
      document['attributes.service.namespace'] = document['resource.attributes.service.namespace'];
      document['resource.attributes.deployment.environment'] =
        document['resource.attributes.service.namespace'];

      document['scope.attributes.service.framework.name'] =
        document['resource.attributes.service.name'];
      document['scope.name'] = document['resource.attributes.service.name'];

      document['attributes.processor.event'] =
        document['attributes.processor.event'] ?? (!!kind ? kindToProcessorEvent[kind] : undefined);

      const event = document['attributes.processor.event'];

      switch (event) {
        case 'span': {
          document['attributes.span.id'] = spanId;
          document['attributes.span.name'] = name;
          document['attributes.span.type'] =
            kind === 'Internal'
              ? 'app'
              : document['attributes.http.url']
              ? 'http'
              : document['attributes.db.system']
              ? 'db'
              : document['attributes.messaging.system']
              ? 'messaging'
              : 'custom';
          document['attributes.span.subtype'] =
            kind === 'Internal'
              ? 'internal'
              : document['attributes.http.url']
              ? 'http'
              : document['attributes.db.system'] ??
                document['attributes.messaging.system'] ??
                'internal';

          document['attributes.span.duration.us'] = duration;
          break;
        }
        case 'transaction': {
          document['attributes.transaction.id'] = spanId;
          document['attributes.transaction.name'] = name;
          document['attributes.transaction.duration.us'] = duration;
          document['attributes.transaction.type'] = document['attributes.http.request.method']
            ? 'request'
            : document['attributes.messaging.system'] ?? 'unknown';
          document['attributes.transaction.sampled'] = true;
        }
        default: {
          const error = new Error('Cannot determine a processor.event for event');
          Object.assign(error, { document });
        }
      }

      callback(null, document);
    },
  });
}
