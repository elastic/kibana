/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';

export type LogDocument = Fields &
  Partial<{
    'input.type': string;
    'log.file.path'?: string;
    'service.name'?: string;
    'service.environment'?: string;
    'data_stream.namespace': string;
    'data_stream.type': string;
    'data_stream.dataset': string;
    message?: string;
    'error.message'?: string;
    'event.original'?: string;
    'event.dataset': string;
    'log.level'?: string;
    'host.name'?: string;
    'container.id'?: string;
    'trace.id'?: string;
    'transaction.id'?: string;
    'agent.id'?: string;
    'agent.name'?: string;
    'orchestrator.cluster.name'?: string;
    'orchestrator.cluster.id'?: string;
    'orchestrator.resource.id'?: string;
    'kubernetes.pod.uid'?: string;
    'aws.s3.bucket.name'?: string;
    'orchestrator.namespace'?: string;
    'container.name'?: string;
    'cloud.provider'?: string;
    'cloud.region'?: string;
    'cloud.availability_zone'?: string;
    'cloud.project.id'?: string;
    'cloud.instance.id'?: string;
    'error.stack_trace'?: string;
    'error.exception.stacktrace'?: string;
    'error.log.stacktrace'?: string;
    'log.custom': Record<string, unknown>;
  }>;

class Log extends Serializable<LogDocument> {
  service(name: string) {
    this.fields['service.name'] = name;
    return this;
  }

  hostName(name: string) {
    this.fields['host.name'] = name;
    return this;
  }

  containerId(id: string) {
    this.fields['container.id'] = id;
    return this;
  }

  namespace(value: string) {
    this.fields['data_stream.namespace'] = value;
    return this;
  }

  dataset(value: string) {
    this.fields['data_stream.dataset'] = value;
    this.fields['event.dataset'] = value;
    return this;
  }

  logLevel(level: string) {
    this.fields['log.level'] = level;
    return this;
  }

  message(message: string) {
    this.fields.message = message;
    return this;
  }
}

function create(): Log {
  return new Log({
    'input.type': 'logs',
    'data_stream.namespace': 'default',
    'data_stream.type': 'logs',
    'data_stream.dataset': 'synth',
    'event.dataset': 'synth',
    'host.name': 'synth-host',
  });
}

export const log = {
  create,
};
