/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomInt } from 'crypto';
import { Fields } from '../entity';
import { Serializable } from '../serializable';

export const LONG_FIELD_NAME =
  'thisisaverylongfieldnamethatevendoesnotcontainanyspaceswhyitcouldpotentiallybreakouruiinseveralplaces';

const LOGSDB_DATASET_PREFIX = 'logsdb.';

interface LogsOptions {
  isLogsDb: boolean;
}

const defaultLogsOptions: LogsOptions = {
  isLogsDb: false,
};

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
    'aws.kinesis.name'?: string;
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
    'host.geo.location': number[];
    'host.ip': string;
    'network.bytes': number;
    'tls.established': boolean;
    'event.duration': number;
    'event.start': Date;
    'event.end': Date;
    test_field: string | string[];
    date: Date;
    severity: string;
    msg: string;
    svc: string;
    hostname: string;
    [LONG_FIELD_NAME]: string;
  }>;

class Log extends Serializable<LogDocument> {
  constructor(fields: LogDocument, private logsOptions: LogsOptions) {
    super({
      ...fields,
    });
  }

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
    const dataset = `${this.logsOptions.isLogsDb ? LOGSDB_DATASET_PREFIX : ''}${value}`;
    this.fields['data_stream.dataset'] = dataset;
    this.fields['event.dataset'] = dataset;
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

  setGeoLocation(geoCoordinates: number[]) {
    this.fields['host.geo.location'] = geoCoordinates;
    return this;
  }

  setHostIp(hostIp: string) {
    this.fields['host.ip'] = hostIp;
    return this;
  }

  timestamp(time: number) {
    super.timestamp(time);
    return this;
  }

  deleteField(fieldName: keyof LogDocument) {
    delete this.fields[fieldName];
    return this;
  }
}

function create(logsOptions: LogsOptions = defaultLogsOptions): Log {
  return new Log(
    {
      'input.type': 'logs',
      'data_stream.namespace': 'default',
      'data_stream.type': 'logs',
      'host.name': 'synth-host',
      'network.bytes': randomInt(500, 10000),
      'tls.established': Math.random() < 0.5,
    },
    logsOptions
  ).dataset('synth');
}

export const log = {
  create,
};
