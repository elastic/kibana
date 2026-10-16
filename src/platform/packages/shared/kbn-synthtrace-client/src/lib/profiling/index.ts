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

export const UNIVERSAL_PROFILING_EVENTS_INDEX = 'profiling-events-all';
export const UNIVERSAL_PROFILING_HOSTS_INDEX = 'profiling-hosts';
export const OTEL_PROFILING_EVENTS_INDEX = 'profiling-events-all.otel-default';
export const OTEL_PROFILING_HOSTS_INDEX = 'profiling-hosts.otel-default';

export type UniversalProfilingEventDocument = Fields &
  Partial<{
    _index: string;
    'Stacktrace.id': string;
    'Stacktrace.count': number;
    'profiling.project.id': string;
    'host.id': string;
    'host.name': string;
    'host.ip': string;
    'process.thread.name': string;
    'process.executable.name': string;
    'container.name': string;
    'orchestrator.resource.name': string;
    'service.name': string;
  }>;

export type UniversalProfilingHostDocument = Fields &
  Partial<{
    _index: string;
    'host.id': string;
    'host.name': string;
    'profiling.project.id': string;
    'profiling.host.name': string;
    'profiling.host.ip': string;
    'profiling.host.machine': string;
    'profiling.host.kernel_version': string;
    'profiling.agent.version': string;
  }>;

export type OtelProfilingEventDocument = Fields &
  Partial<{
    _index: string;
    'stacktrace.id': string;
    count: number;
    sampling_frequency: number;
    resource: {
      attributes: Partial<{
        'host.id': string;
        'host.name': string;
        'thread.name': string;
        'process.executable.name': string;
        'service.name': string;
        'container.id': string;
        'container.name': string;
        'k8s.pod.name': string;
        'k8s.namespace.name': string;
      }>;
    };
  }>;

export type OtelProfilingHostDocument = Fields &
  Partial<{
    _index: string;
    resource: {
      attributes: Partial<{
        'host.id': string;
        'host.name': string;
        'host.arch': string;
        'host.type': string;
        'os.type': string;
        'cloud.provider': string;
        'cloud.region': string;
      }>;
    };
  }>;

export type UniversalProfilingDocument =
  | UniversalProfilingEventDocument
  | UniversalProfilingHostDocument;

export type OtelProfilingDocument = OtelProfilingEventDocument | OtelProfilingHostDocument;

class ProfilingEntity<
  TFields extends UniversalProfilingDocument | OtelProfilingDocument
> extends Serializable<TFields> {
  // Profiling documents store `@timestamp` in epoch seconds instead of milliseconds.
  serialize(): TFields[] {
    const { '@timestamp': timestamp } = this.fields;

    if (timestamp === undefined) {
      return [this.fields];
    }

    return [{ ...this.fields, '@timestamp': Math.floor(timestamp / 1000) }];
  }
}

export const universalProfiling = {
  event: (fields: Omit<UniversalProfilingEventDocument, '_index'>) =>
    new ProfilingEntity<UniversalProfilingEventDocument>({
      ...fields,
      _index: UNIVERSAL_PROFILING_EVENTS_INDEX,
    }),
  host: (fields: Omit<UniversalProfilingHostDocument, '_index'>) =>
    new ProfilingEntity<UniversalProfilingHostDocument>({
      ...fields,
      _index: UNIVERSAL_PROFILING_HOSTS_INDEX,
    }),
};

export const otelProfiling = {
  event: (fields: Omit<OtelProfilingEventDocument, '_index'>) =>
    new ProfilingEntity<OtelProfilingEventDocument>({
      ...fields,
      _index: OTEL_PROFILING_EVENTS_INDEX,
    }),
  host: (fields: Omit<OtelProfilingHostDocument, '_index'>) =>
    new ProfilingEntity<OtelProfilingHostDocument>({
      ...fields,
      _index: OTEL_PROFILING_HOSTS_INDEX,
    }),
};
