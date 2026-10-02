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

export type UniversalProfilingDocument =
  | UniversalProfilingEventDocument
  | UniversalProfilingHostDocument;

class UniversalProfilingEntity<
  TFields extends UniversalProfilingDocument
> extends Serializable<TFields> {
  // Universal Profiling stores `@timestamp` in epoch seconds instead of milliseconds.
  serialize(): TFields[] {
    const { '@timestamp': timestamp } = this.fields;

    if (timestamp === undefined) {
      return [this.fields];
    }

    return [{ ...this.fields, '@timestamp': Math.floor(timestamp / 1000) }];
  }
}

const event = (
  fields: Omit<UniversalProfilingEventDocument, '_index'>
): UniversalProfilingEntity<UniversalProfilingEventDocument> =>
  new UniversalProfilingEntity<UniversalProfilingEventDocument>({
    ...fields,
    _index: UNIVERSAL_PROFILING_EVENTS_INDEX,
  });

const host = (
  fields: Omit<UniversalProfilingHostDocument, '_index'>
): UniversalProfilingEntity<UniversalProfilingHostDocument> =>
  new UniversalProfilingEntity<UniversalProfilingHostDocument>({
    ...fields,
    _index: UNIVERSAL_PROFILING_HOSTS_INDEX,
  });

export const universalProfiling = {
  event,
  host,
};
