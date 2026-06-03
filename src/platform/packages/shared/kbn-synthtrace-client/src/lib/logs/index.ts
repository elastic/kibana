/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { Fields } from '../entity';
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
    _index?: string;
    'input.type': string;
    'log.file.path'?: string;
    'service.name'?: string;
    'service.environment'?: string;
    'service.version'?: string;
    'data_stream.namespace': string;
    'data_stream.type': string;
    'data_stream.dataset': string;
    message?: string;
    'error.message'?: string;
    'event.original'?: string;
    'event.dataset': string;
    'event.ingested': string;
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
    'client.ip'?: string;
    'error.stack_trace'?: string;
    'error.exception'?: unknown;

    // OTel log exception fields https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/
    'error.exception.type'?: string;
    'error.exception.message'?: string;

    'error.log'?: unknown;
    'log.custom': Record<string, unknown>;
    'host.geo.location': number[];
    'host.geo.city_name'?: string;
    'host.geo.country_name'?: string;
    'host.geo.country_iso_code'?: string;
    'host.geo.continent_name'?: string;
    'host.geo.region_name'?: string;
    'host.geo.timezone'?: string;
    'host.ip': string;
    'network.bytes': number;
    'tls.established': boolean;
    'event.duration': number;
    'event.start': Date;
    'event.end': Date;
    'event.category'?: string;
    'event.type'?: string;
    'event.outcome'?: string;
    'event.action'?: string;
    'event.sequence'?: number;
    'event.name'?: string;
    'source.ip'?: string;
    'rule.name'?: string;

    labels?: Record<string, string>;
    test_field: string | string[];
    date: Date;
    severity: string;
    msg: string;
    svc: string;
    hostname: string;
    [LONG_FIELD_NAME]: string;
    'http.response.status_code'?: number;
    'http.response.bytes'?: number;
    'http.request.method'?: string;
    'http.request.referrer'?: string;
    'http.version'?: string;
    'url.path'?: string;
    'process.name'?: string;
    'kubernetes.namespace'?: string;
    'kubernetes.pod.name'?: string;
    'kubernetes.container.name'?: string;
    'kubernetes.deployment.name'?: string;
    'kubernetes.replicaset.name'?: string;
    'kubernetes.statefulset.name'?: string;
    'kubernetes.daemonset.name'?: string;
    'orchestrator.resource.name'?: string;
    tags?: string | string[];
    'user.name'?: string;
    'user_agent.name'?: string;
    'orchestrator.type'?: string;
    'orchestrator.resource.type'?: string;
    'container.image.name'?: string;
    'container.image.tag'?: string;
    'container.runtime'?: string;
    'host.os.platform'?: string;
    'host.os.name'?: string;
    'host.os.version'?: string;
    'host.architecture'?: string;
    'cloud.instance.name'?: string;
    'kubernetes.container.image'?: string;
    'kubernetes.container.image_id'?: string;
    'kubernetes.node.name'?: string;
    'kubernetes.node.uid'?: string;
    'kubernetes.labels.app'?: string;
    'kubernetes.labels.version'?: string;
    'kubernetes.labels.tier'?: string;
    'kubernetes.annotations.deployment'?: string;
    'process.pid'?: number;
    'deployment.name'?: string;
    'network.protocol'?: string;
    'network.transport'?: string;
    'network.type'?: string;
    'tls.version'?: string;
    'tls.cipher'?: string;
    'tls.server.subject'?: string;
    'tls.client.subject'?: string;
    'session.id'?: string;
    'span.id'?: string;
    'error.type'?: string;
    'error.code'?: string;
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

function createForIndex(index: string): Log {
  return new Log(
    {
      'input.type': 'logs',
      _index: index,
    },
    defaultLogsOptions
  );
}

function createMinimal({
  dataset = 'synth',
  namespace = 'default',
}: {
  dataset?: string;
  namespace?: string;
} = {}): Log {
  return new Log(
    {
      'input.type': 'logs',
      'data_stream.namespace': namespace,
      'data_stream.type': 'logs',
      'data_stream.dataset': dataset,
      'event.dataset': dataset,
    },
    { isLogsDb: false }
  );
}

export const log = {
  create,
  createForIndex,
  createMinimal,
};

function randomInt(min: number, max: number) {
  if (min > max) {
    throw new Error('Min value must be less than or equal to max value.');
  }

  const random = Math.floor(Math.random() * (max - min + 1)) + min;
  return random;
}
