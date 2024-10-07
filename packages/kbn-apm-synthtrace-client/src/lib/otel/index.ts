/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
<<<<<<< HEAD
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

=======
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
import { Serializable } from '../serializable';
import { OtelError } from './error';
import { OtelMetric } from './metric';
import { OtelTransaction } from './transaction';

<<<<<<< HEAD
export interface OtelTrace {
  attributes?: {
    'event.outcome'?: string;
    'event.success_count'?: number;
    'processor.event'?: string;
    'timestamp.us'?: number;
    'transaction.duration.us'?: number;
    'transaction.id'?: string;
    'transaction.name'?: string;
    'transaction.representative_count'?: number;
    'transaction.result'?: string;
    'transaction.root'?: boolean;
    'transaction.sampled'?: boolean;
    'transaction.type'?: string;
    // error
    'exception.message'?: string;
    'exception.type'?: string;
    // metrics
    'metricset.interval'?: string;
    'metricset.name'?: string;
  };
=======
export interface SharedAttributes {
  'service.name'?: string;
  'agent.name'?: string;
  'agent.version'?: string;
  'metricset.interval'?: string;
  'service.instance.id'?: string;
  'telemetry.sdk.language'?: string;
  'telemetry.sdk.name'?: string;
  'telemetry.sdk.version'?: string;
  'some.resource.attribute'?: string;
  'timestamp.us'?: number;
}

export interface OtelDocument extends Fields {
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
  data_stream?: {
    dataset: string;
    namespace: string;
    type: string;
  };
<<<<<<< HEAD
  dropped_attributes_count?: number;
  dropped_events_count?: number;
  dropped_links_count?: number;
  duration?: number;
  kind?: string;
  name?: string;
  resource?: {
    attributes?: {
      'agent.name'?: string;
      'agent.version'?: string;
      'service.name'?: string;
      'some.resource.attribute'?: string;
      'telemetry.sdk.language'?: string;
      'telemetry.sdk.name'?: string;
      'telemetry.sdk.version'?: string;
      // metrics
      'metricset.interval'?: string;
    };
=======
  attributes?: {
    [key: string]: any;
  };
  resource?: {
    attributes?: SharedAttributes;
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
    dropped_attributes_count?: number;
    schema_url?: string;
  };
  scope?: {
    attributes?: {
<<<<<<< HEAD
      'service.framework.name': string;
      'service.framework.version': string;
=======
      'service.framework.name'?: string;
      'service.framework.version'?: string;
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
    };
    dropped_attributes_count?: number;
    name?: string;
  };
<<<<<<< HEAD
  span_id?: string;
  status?: {
    code: string;
  };
  trace_id: string;
  '@timestamp'?: number | undefined;
  'timestamp.us'?: number | undefined;
  // metrics
  metrics?: {
    service_summary?: number;
  };
  'service.name': string[];
}

export type OtelDocument = OtelTrace;

=======
  name?: string;
  trace_id?: string;
  trace?: { id: string }; // / I saw in fields this two representacion of trace id
  span_id?: string;
  span?: { id: string }; // / I saw in fields this two representacion of span id
  dropped_attributes_count?: number;
  dropped_events_count?: number;
  dropped_links_count?: number;
  timestamp_us?: number;
}

>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
class Otel extends Serializable<OtelDocument> {
  constructor(fields: OtelDocument) {
    super({
      ...fields,
    });
  }

<<<<<<< HEAD
  timestamp(time: number) {
    super.timestamp(time);
    return this;
  }

  error(id: string) {
=======
  error(spanId: string) {
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
    return new OtelError({
      ...this.fields,
      attributes: {
        'exception.message': 'boom',
        'exception.type': '*errors.errorString',
        'processor.event': 'error',
        'timestamp.us': 1725633628036123,
<<<<<<< HEAD
=======
        'event.name': 'exception',
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'logs',
      },
<<<<<<< HEAD
      dropped_attributes_count: 0,
      name: 'exception',
=======
      'event.name': 'exception',
      dropped_attributes_count: 0,
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'service.name': 'sendotlp-synth',
<<<<<<< HEAD
          'some.resource.attribute': 'resource.attr',
          'telemetry.sdk.language': 'go',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.28.0',
=======
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
          'some.resource.attribute': 'resource.attr',
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
        },
        dropped_attributes_count: 0,
        schema_url: 'https://opentelemetry.io/schemas/1.26.0',
      },
      scope: {
        attributes: {
          'service.framework.name': 'sendotlp-synth',
          'service.framework.version': '',
        },
        dropped_attributes_count: 0,
        name: 'sendotlp-synth',
      },
<<<<<<< HEAD
      span_id: '96d91c11a4e393fb',
      trace_id: id,
      'service.name': ['sendotlp-synth'],
      fields: {
        'attributes.exception.message': ['boom'],
        'scope.name': ['sendotlp-synth'],
        'resource.attributes.agent.version': ['1.28.0'],
        'service.framework.version': [''],
        'resource.attributes.telemetry.sdk.name': ['opentelemetry'],
        // 'resource.attributes.agent.name.text': ['opentelemetry/go'],
        'resource.attributes.agent.name': ['opentelemetry/go'],
        'resource.attributes.telemetry.sdk.language': ['go'],
        'scope.dropped_attributes_count': [0],
        'service.language.name': ['go'],
        'telemetry.sdk.name': ['opentelemetry'],
        'attributes.timestamp.us': [1725906566779927],
        'telemetry.sdk.language': ['go'],
        'trace.id': [id],
        'exception.message': ['boom'],
        'processor.event': ['error'],
        'resource.schema_url': ['https://opentelemetry.io/schemas/1.26.0'],
        'agent.name': ['opentelemetry/go'],
        'telemetry.sdk.version': ['1.28.0'],
        'scope.attributes.service.framework.name': ['sendotlp-synth'],
        trace_id: [id],
        'service.name': ['sendotlp-synth'],
        'service.framework.name': ['sendotlp-synth'],
        span_id: [`${id}da907a`],
        'data_stream.namespace': ['default'],
        'exception.type': ['*errors.errorString'],
        'resource.attributes.some.resource.attribute': ['resource.attr'],
        'span.id': [`${id}da907a`],
        'some.resource.attribute': ['resource.attr'],
        'data_stream.type': ['logs'],
        'attributes.processor.event': ['error'],
        'timestamp.us': [1725906566779927],
        '@timestamp': ['2024-09-09T18:29:26.779Z'],
        dropped_attributes_count: [0],
        'resource.attributes.telemetry.sdk.version': ['1.28.0'],
        'data_stream.dataset': ['generic.otel'],
        name: ['exception'],
        'agent.version': ['1.28.0'],
        'attributes.exception.type': ['*errors.errorString'],
        'resource.dropped_attributes_count': [0],
        'scope.attributes.service.framework.version': [''],
        'resource.attributes.service.name': ['sendotlp-synth'],
        'scope.attributes.service.framework.name.text': ['sendotlp-synth'],
      },
    });
  }

  metric(id: string) {
=======
      span_id: spanId,
      span: { id: spanId },
      timestamp_us: 1725633628036123,
    });
  }

  metric() {
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
    return new OtelMetric({
      ...this.fields,
      attributes: {
        'metricset.interval': '1m',
        'metricset.name': 'service_summary',
        'processor.event': 'metric',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'metrics',
      },
      metrics: {
        service_summary: 2,
      },
      resource: {
        attributes: {
<<<<<<< HEAD
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'metricset.interval': '1m',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
          'telemetry.sdk.language': 'go',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.28.0',
=======
          'agent.name': 'otlp',
          'agent.version': 'unknown',
          'metricset.interval': '1m',
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
        },
        dropped_attributes_count: 0,
      },
      scope: {
        dropped_attributes_count: 0,
        name: 'github.com/open-telemetry/opentelemetry-collector-contrib/connector/countconnector',
      },
<<<<<<< HEAD
      trace_id: id,
      service: {
        name: ['sendotlp-synth'],
      },
      fields: {
        'resource.attributes.agent.version': ['1.28.0'],
        'scope.name': ['otelcol/spanmetricsconnectorv2'],
        'resource.attributes.telemetry.sdk.name': ['opentelemetry'],
        'resource.attributes.agent.name': ['opentelemetry/go'],
        'resource.attributes.telemetry.sdk.language': ['go'],
        'scope.dropped_attributes_count': [0],
        'service.language.name': ['go'],
        'telemetry.sdk.name': ['opentelemetry'],
        'telemetry.sdk.language': ['go'],
        'transaction.root': [true],
        'processor.event': ['metric'],
        'resource.attributes.metricset.interval': ['1m'],
        'agent.name': ['opentelemetry/go'],
        'telemetry.sdk.version': ['1.28.0'],
        'attributes.metricset.name': ['service_transaction'],
        'metrics.transaction.duration.histogram': [
          {
            values: [12500],
            counts: [1],
          },
        ],
        'attributes.transaction.root': [true],
        'service.name': ['sendotlp-synth'],
        'data_stream.namespace': ['default'],
        'resource.attributes.some.resource.attribute': ['resource.attr'],
        'some.resource.attribute': ['resource.attr'],
        'metricset.interval': ['1m'],
        'data_stream.type': ['metrics'],
        'transaction.duration.histogram': [
          {
            values: [12500],
            counts: [1],
          },
        ],
        'transaction.type': ['unknown'],
        'metricset.name': ['service_transaction'],
        'attributes.processor.event': ['metric'],
        '@timestamp': ['2024-09-09T15:49:44.920Z'],
        'resource.attributes.telemetry.sdk.version': ['1.28.0'],
        'data_stream.dataset': ['generic.otel'],
        'attributes.transaction.type': ['unknown'],
        'agent.version': ['1.28.0'],
        'attributes.metricset.interval': ['1m'],
        'resource.dropped_attributes_count': [0],
        'resource.attributes.service.name': ['sendotlp-synth'],
      },
    });
  }
=======
    });
  }

>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
  transaction(id: string) {
    return new OtelTransaction({
      ...this.fields,
      attributes: {
        'event.outcome': 'success',
        'event.success_count': 1,
        'processor.event': 'transaction',
<<<<<<< HEAD
        'timestamp.us': 1725464233071114,
        'transaction.duration.us': 15202,
        'transaction.id': 'da907d6b5267c8f6',
=======
        'timestamp.us': 1726580752010657,
        'transaction.duration.us': 15202,
        'transaction.id': id,
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
        'transaction.name': 'parent-synth',
        'transaction.representative_count': 1,
        'transaction.result': 'Success',
        'transaction.root': true,
        'transaction.sampled': true,
        'transaction.type': 'unknown',
      },
<<<<<<< HEAD
      dropped_attributes_count: 0,
      dropped_events_count: 0,
      dropped_links_count: 0,
      duration: 15202584,
=======
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'traces',
      },
      duration: 11742370,
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
      kind: 'Internal',
      name: 'parent-synth',
      resource: {
        attributes: {
<<<<<<< HEAD
          'agent.name': 'opentelemetry/go',
          'agent.version': '1.28.0',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
          'telemetry.sdk.language': 'go',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.28.0',
=======
          'agent.name': 'otlp',
          'agent.version': '1.28.0',
          'service.instance.id': '89117ac1-0dbf-4488-9e17-4c2c3b76943a',
          'service.name': 'sendotlp-synth',
          'some.resource.attribute': 'resource.attr',
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
        },
        dropped_attributes_count: 0,
        schema_url: 'https://opentelemetry.io/schemas/1.26.0',
      },
      scope: {
        attributes: {
          'service.framework.name': 'sendotlp-synth',
          'service.framework.version': '',
        },
        dropped_attributes_count: 0,
        name: 'sendotlp-synth',
      },
<<<<<<< HEAD
      span_id: `${id}da907a`,
      status: {
        code: 'Unset',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'traces',
      },
      trace_id: id,
      fields: {
        // 'resource.attributes.telemetry.sdk.name.text': ['opentelemetry'],
        // 'resource.attributes.telemetry.sdk.name.text': ['opentelemetry'],
        'scope.name': ['sendotlp-synth'],
        'resource.attributes.telemetry.sdk.name': ['opentelemetry'],
        'resource.attributes.agent.name': ['opentelemetry/go'],
        // 'resource.attributes.agent.name.text': ['opentelemetry/go'],
        'transaction.representative_count': [1],
        'scope.dropped_attributes_count': [0],
        'service.language.name': ['go'],
        'transaction.result': ['Success'],
        'transaction.id': [id],
        'attributes.event.success_count': [1],
        'attributes.timestamp.us': [1725896984908682],
        'telemetry.sdk.language': ['go'],
        'processor.event': ['transaction'],
        'resource.schema_url': ['https://opentelemetry.io/schemas/1.26.0'],
        'agent.name': ['opentelemetry/go'],
        'telemetry.sdk.version': ['1.28.0'],
        'event.outcome': ['success'],
        'scope.attributes.service.framework.name': ['sendotlp-synth'],
        'attributes.transaction.sampled': [true],
        span_id: [`${id}da907a`],
        kind: ['Internal'],
        'attributes.transaction.duration.us': [12026],
        'attributes.transaction.name': ['parent-synth'],
        'transaction.duration.us': [12026],
        'span.id': [`${id}da907a`],
        'data_stream.type': ['traces'],
        'timestamp.us': [1725896984908682],
        'resource.attributes.telemetry.sdk.version': ['1.28.0'],
        name: ['parent-synth'],
        'agent.version': ['1.28.0'],
        'transaction.name': ['parent-synth'],
        'resource.dropped_attributes_count': [0],
        'scope.attributes.service.framework.version': [''],
        'attributes.transaction.representative_count': [1],
        'span.name': ['parent-synth'],
        'resource.attributes.agent.version': ['1.28.0'],
        'attributes.transaction.id': [id],
        'service.framework.version': [''],
        'resource.attributes.telemetry.sdk.language': ['go'],
        'status.code': ['Unset'],
        'transaction.sampled': [true],
        'telemetry.sdk.name': ['opentelemetry'],
        duration: [12026084],
        'attributes.transaction.result': ['Success'],
        'trace.id': [id],
        // 'attributes.transaction.name.text': ['parent-synth'],
        'event.success_count': [1],
        'transaction.root': [true],
        // 'scope.attributes.service.framework.name.text': ['sendotlp-synth'],
        'attributes.transaction.root': [true],
        dropped_events_count: [0],
        trace_id: [id],
        'service.name': ['sendotlp-synth'],
        'service.framework.name': ['sendotlp-synth'],
        'data_stream.namespace': ['default'],
        'resource.attributes.some.resource.attribute': ['resource.attr'],
        'some.resource.attribute': ['resource.attr'],
        dropped_links_count: [0],
        'transaction.type': ['unknown'],
        'attributes.processor.event': ['transaction'],
        '@timestamp': ['2024-09-09T15:49:44.908Z'],
        dropped_attributes_count: [0],
        'data_stream.dataset': ['generic.otel'],
        'attributes.event.outcome': ['success'],
        'attributes.transaction.type': ['unknown'],
        'resource.attributes.service.name': ['sendotlp-synth'],
        // 'resource.attributes.service.name.text': ['sendotlp-synth'],
      },
=======
      transaction: { id },
      span_id: id,
      status: {
        code: 'Unset',
      },
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
    });
  }
}

<<<<<<< HEAD
export function create(): Otel {
  return new Otel();
=======
export function create(id: string): Otel {
  return new Otel({
    trace_id: id,
    dropped_attributes_count: 0,
    dropped_events_count: 0,
    dropped_links_count: 0,
  });
>>>>>>> 46b62aa3664b26f4a589e4d58e39fc542d15b9a5
}

export const otel = {
  create,
};
