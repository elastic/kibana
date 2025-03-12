/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../../entity';
import { Serializable } from '../../serializable';
import { OtelEdotMetric } from './metric';
import { OtelEdotTransaction } from './transaction';

interface OtelEdotSharedResourceAttributes {
  'service.name'?: string;
  'agent.name'?: string;
  'agent.version'?: string;
  'metricset.interval'?: string;
  'service.instance.id'?: string;
  'telemetry.sdk.language'?: string;
  'telemetry.sdk.name'?: string;
  'telemetry.sdk.version'?: string;
}

export interface OtelEdotDocument extends Fields {
  data_stream?: {
    dataset: string;
    namespace: string;
    type: string;
  };
  attributes?: {
    'timestamp.us'?: number;
    'metricset.name'?: string;
    [key: string]: any;
  };
  resource?: {
    attributes?: OtelEdotSharedResourceAttributes;
    dropped_attributes_count?: number;
    schema_url?: string;
  };
  scope?: {
    attributes?: {
      'service.framework.name'?: string;
      'service.framework.version'?: string;
    };
    dropped_attributes_count?: number;
    name?: string;
  };
  name?: string;
  trace_id?: string;
  trace?: { id: string };
  span_id?: string;
  span?: { id: string };
  dropped_attributes_count?: number;
  dropped_events_count?: number;
  dropped_links_count?: number;
  timestamp_us?: number;
}

class OtelEdot extends Serializable<OtelEdotDocument> {
  constructor(fields: OtelEdotDocument) {
    super({
      ...fields,
    });
  }

  metric() {
    return new OtelEdotMetric({
      ...this.fields,
      attributes: {
        'service.name': 'adservice-edot-synth',
        'span.kind': 'SPAN_KIND_INTERNAL',
        'span.name': 'SynchronizationContext#drain',
        'status.code': 'STATUS_CODE_UNSET',
        'metricset.name': 'service_summary',
        'processor.event': 'metric',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'metrics',
      },
      metrics: {
        'traces.span.metrics.calls': 1,
      },
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/java/elastic',
          'agent.version': '1.0.1-SNAPSHOT',
          'app.label.name': 'otel-demo-blue-adservice-edot-synth',
          'cloud.account.id': 'elastic-product',
          'cloud.availability_zone': 'us-central1-a',
          'cloud.platform': 'gcp_kubernetes_engine',
          'cloud.provider': 'gcp',
          'container.id': 'e4f5dd426472aacd6124e85a0cd8a1ef55c263374c16179d1bf75292224c2dc0',
          'deployment.environment': 'opentelemetry-demo',
          'host.arch': 'amd64',
          'host.id': '8645892066193866279',
          'host.name': 'gke-demo-elastic-co-pool-5-29a9d3db-t79s',
          'k8s.cluster.name': 'demo-elastic-co',
          'k8s.deployment.name': 'otel-demo-blue-adservice-edot-synth',
          'k8s.namespace.name': 'otel-blue',
          'k8s.node.name': 'gke-demo-elastic-co-pool-5-29a9d3db-t79s',
          'k8s.pod.ip': '10.12.3.63',
          'k8s.pod.name': 'otel-demo-blue-adservice-edot-synth-7c68c8f968-tvf54',
          'k8s.pod.start_time': '2025-01-15T12:51:39Z',
          'k8s.pod.uid': 'da7a8507-53be-421c-8d77-984f12397213',
          'k8s.replicaset.name': 'otel-demo-blue-adservice-edot-synth-7c68c8f968',
          'os.description': 'Linux 5.15.109+',
          'os.type': 'linux',
          'process.command_line':
            '/opt/java/openjdk/bin/java -javaagent:/usr/src/app/opentelemetry-javaagent.jar oteldemo.AdServiceEdotSynth',
          'process.executable.path': '/opt/java/openjdk/bin/java',
          'process.pid': 1,
          'process.runtime.description': 'Eclipse Adoptium OpenJDK 64-Bit Server VM 21.0.5+11-LTS',
          'process.runtime.name': 'OpenJDK Runtime Environment',
          'process.runtime.version': '21.0.5+11-LTS',
          'service.instance.id': 'da7a8507-53be-421c-8d77-984f12397213',
          'service.name': 'adservice-edot-synth',
          'service.namespace': 'opentelemetry-demo',
          'telemetry.distro.name': 'elastic',
          'telemetry.distro.version': '1.0.1-SNAPSHOT',
          'telemetry.sdk.language': 'java',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.43.0',
        },
      },
      scope: {
        dropped_attributes_count: 0,
        name: 'spanmetricsconnector',
      },
    });
  }

  transaction(id: string) {
    return new OtelEdotTransaction({
      ...this.fields,
      attributes: {
        'app.ads.ad_request_type': 'TARGETED',
        'app.ads.ad_response_type': 'TARGETED',
        'app.ads.contextKeys': '[travel]',
        'app.ads.contextKeys.count': 1,
        'app.ads.count': 1,
        'event.outcome': 'success',
        'event.success_count': 1,
        'network.peer.address': '10.12.9.56',
        'network.peer.port': 41208,
        'network.type': 'ipv4',
        'processor.event': 'transaction',
        'rpc.grpc.status_code': 0,
        'rpc.method': 'GetAds',
        'rpc.service': 'oteldemo.AdServiceEdotSynth',
        'rpc.system': 'grpc',
        'server.address': 'otel-demo-blue-adservice-edot-synth',
        'server.port': 8080,
        'session.id': 'ce3ed7c7-47d7-42a5-baae-86d0a716752d',
        'thread.id': 9412,
        'thread.name': 'grpc-default-executor-23',
        'timestamp.us': 1740679709260508,
        'transaction.duration.us': 551,
        'transaction.id': id,
        'transaction.name': 'oteldemo.AdServiceEdotSynth/GetAds',
        'transaction.representative_count': 1,
        'transaction.result': 'OK',
        'transaction.root': false,
        'transaction.sampled': true,
        'transaction.type': 'request',
      },
      data_stream: {
        dataset: 'generic.otel',
        namespace: 'default',
        type: 'traces',
      },
      duration: 551551,
      kind: 'Server',
      name: 'oteldemo.AdServiceEdotSynth/GetAds',
      // parent_span_id: 'b8fc0a55e4ae6b53',
      resource: {
        attributes: {
          'agent.name': 'opentelemetry/java/elastic',
          'agent.version': '1.0.1-SNAPSHOT',
          'app.label.name': 'otel-demo-blue-adservice-edot-synth',
          'cloud.account.id': 'elastic-product',
          'cloud.availability_zone': 'us-central1-a',
          'cloud.platform': 'gcp_kubernetes_engine',
          'cloud.provider': 'gcp',
          'container.id': 'e4f5dd426472aacd6124e85a0cd8a1ef55c263374c16179d1bf75292224c2dc0',
          'deployment.environment': 'opentelemetry-demo',
          'host.arch': 'amd64',
          'host.id': '8645892066193866279',
          'host.name': 'gke-demo-elastic-co-pool-5-29a9d3db-t79s',
          'k8s.cluster.name': 'demo-elastic-co',
          'k8s.deployment.name': 'otel-demo-blue-adservice-edot-synth',
          'k8s.namespace.name': 'otel-blue',
          'k8s.node.name': 'gke-demo-elastic-co-pool-5-29a9d3db-t79s',
          'k8s.pod.ip': '10.12.3.63',
          'k8s.pod.name': 'otel-demo-blue-adservice-edot-synth-7c68c8f968-tvf54',
          'k8s.pod.start_time': '2025-01-15T12:51:39Z',
          'k8s.pod.uid': 'da7a8507-53be-421c-8d77-984f12397213',
          'k8s.replicaset.name': 'otel-demo-blue-adservice-edot-synth-7c68c8f968',
          'os.description': 'Linux 5.15.109+',
          'os.type': 'linux',
          'process.command_line':
            '/opt/java/openjdk/bin/java -javaagent:/usr/src/app/opentelemetry-javaagent.jar oteldemo.AdServiceEdotSynth',
          'process.executable.path': '/opt/java/openjdk/bin/java',
          'process.pid': 1,
          'process.runtime.description': 'Eclipse Adoptium OpenJDK 64-Bit Server VM 21.0.5+11-LTS',
          'process.runtime.name': 'OpenJDK Runtime Environment',
          'process.runtime.version': '21.0.5+11-LTS',
          'service.instance.id': 'da7a8507-53be-421c-8d77-984f12397213',
          'service.name': 'adservice-edot-synth',
          'service.namespace': 'opentelemetry-demo',
          'telemetry.distro.name': 'elastic',
          'telemetry.distro.version': '1.0.1-SNAPSHOT',
          'telemetry.sdk.language': 'java',
          'telemetry.sdk.name': 'opentelemetry',
          'telemetry.sdk.version': '1.43.0',
        },
        // schema_url: 'https://opentelemetry.io/schemas/1.24.0',
      },
      scope: {
        attributes: {
          'service.framework.name': 'io.opentelemetry.grpc-1.6',
          'service.framework.version': '2.9.0-alpha',
        },
        dropped_attributes_count: 0,
        name: 'io.opentelemetry.grpc-1.6',
        // version: '2.9.0-alpha',
      },
      span_id: '8884909eca61b9d5',
      status: {
        code: 'Unset',
      },
      trace_id: '70219abfdc4f0e17ca0975a339c2c135',
    });
  }
}

export function create(id: string): OtelEdot {
  return new OtelEdot({
    trace_id: id,
    dropped_attributes_count: 0,
    dropped_events_count: 0,
    dropped_links_count: 0,
  });
}

export const otelEdot = {
  create,
};
