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

export interface OtelEdotTransactionDocument extends OtelEdotDocument {
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
    'http.response.status_code'?: number;
    'http.request.method'?: string;
    'url.full'?: string;
    'service.name'?: string;
    'service.namespace'?: string;
    'service.instance.id'?: string;
    'service.target.name'?: string;
    'service.target.type'?: string;
    'span.name'?: string;
    'span.destination.service.resource'?: string;
    'app.ads.ad_request_type'?: string;
    'app.ads.ad_response_type'?: string;
    'app.ads.contextKeys'?: string;
    'app.ads.contextKeys.count'?: number;
    'app.ads.count'?: number;
    'network.peer.address'?: string;
    'network.peer.port'?: number;
    'network.type'?: string;
    'rpc.grpc.status_code'?: number;
    'rpc.method'?: string;
    'rpc.service'?: string;
    'rpc.system'?: string;
    'server.address'?: string;
    'server.port'?: number;
    'session.id'?: string;
    'thread.id'?: number;
    'thread.name'?: string;
  };
  status?: {
    code?: string;
  };
  dropped_events_count?: number;
  dropped_links_count?: number;
  duration?: number;
  kind?: string;
  name?: string;
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
      'k8s.pod.start_time'?: string;
      'k8s.replicaset.name'?: string;
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

export class OtelEdotTransaction extends Serializable<OtelEdotTransactionDocument> {
  constructor(fields: OtelEdotTransactionDocument) {
    super({
      ...fields,
    });
  }
}
