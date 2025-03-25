/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OtelEdotDocument } from '.';
import { Serializable } from '../../serializable';

export interface OtelEdotMetricDocument extends OtelEdotDocument {
  attributes?: {
    'metricset.name'?: string;
    'processor.event'?: string;
    'event.outcome'?: string;
    'service.name'?: string;
    'span.name'?: string;
    'span.kind'?: string;
    'status.code'?: string;
    'span.destination.service.resource'?: string;
  };
  metrics?: {
    service_summary?: number;
    'traces.span.metrics.calls'?: number;
  };
  resource?: {
    attributes?: {
      'agent.name'?: string;
      'agent.version'?: string;
      'app.label.name'?: string;
      'cloud.account.id'?: string;
      'cloud.availability_zone'?: string;
      'cloud.platform'?: string;
      'cloud.provider'?: string;
      'container.id'?: string;
      'deployment.environment'?: string;
      'host.arch'?: string;
      'host.id'?: string;
      'host.name'?: string;
      'k8s.cluster.name'?: string;
      'k8s.deployment.name'?: string;
      'k8s.namespace.name'?: string;
      'k8s.node.name'?: string;
      'k8s.pod.ip'?: string;
      'k8s.pod.name'?: string;
      'k8s.pod.uid'?: string;
      'k8s.replicaset.name'?: string;
      'k8s.pod.start_time'?: string;
      'os.description'?: string;
      'os.type'?: string;
      'process.command_args'?: string;
      'process.command_line'?: string;
      'process.executable.path'?: string;
      'process.pid'?: number;
      'process.runtime.description'?: string;
      'process.runtime.name'?: string;
      'process.runtime.version'?: string;
      'service.instance.id'?: string;
      'service.name'?: string;
      'service.namespace'?: string;
      'telemetry.distro.name'?: string;
      'telemetry.distro.version'?: string;
      'telemetry.sdk.language'?: string;
      'telemetry.sdk.name'?: string;
      'telemetry.sdk.version'?: string;
    };
  };
}
export class OtelEdotMetric extends Serializable<OtelEdotMetricDocument> {
  constructor(fields: OtelEdotMetricDocument) {
    super({
      ...fields,
    });
  }
}
