/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateLongId, generateShortId } from '../utils/generate_id';
import { ApmFields } from './apm_fields';
import { BaseSpan } from './base_span';
import { Metricset } from './metricset';

export type FaasTriggerType = 'http' | 'pubsub' | 'datasource' | 'timer' | 'other';

export class Serverless extends BaseSpan {
  private readonly metric: Metricset<ApmFields>;

  constructor(fields: ApmFields) {
    const faasExection = generateLongId();
    const triggerType = 'other';
    super({
      ...fields,
      'processor.event': 'transaction',
      'transaction.id': generateShortId(),
      'transaction.sampled': true,
      'faas.execution': faasExection,
      'faas.trigger.type': triggerType,
      'transaction.name': fields['transaction.name'] || fields['faas.name'],
      'transaction.type': 'request',
    });
    this.metric = new Metricset<ApmFields>({
      ...fields,
      'metricset.name': 'app',
      'faas.execution': faasExection,
    });
  }

  duration(duration: number) {
    this.fields['transaction.duration.us'] = duration * 1000;
    return this;
  }

  coldStart(coldstart: boolean) {
    this.fields['faas.coldstart'] = coldstart;
    this.metric.fields['faas.coldstart'] = coldstart;
    return this;
  }

  billedDuration(billedDuration: number) {
    this.metric.fields['faas.billed_duration'] = billedDuration;
    return this;
  }

  faasTimeout(faasTimeout: number) {
    this.metric.fields['faas.timeout'] = faasTimeout;
    return this;
  }

  memory({ total, free }: { total: number; free: number }) {
    this.metric.fields['system.memory.total'] = total;
    this.metric.fields['system.memory.actual.free'] = free;
    return this;
  }

  coldStartDuration(coldStartDuration: number) {
    this.metric.fields['faas.coldstart_duration'] = coldStartDuration;
    return this;
  }

  faasDuration(faasDuration: number) {
    this.metric.fields['faas.duration'] = faasDuration;
    return this;
  }

  timestamp(time: number): this {
    super.timestamp(time);
    this.metric.fields['@timestamp'] = time;
    return this;
  }

  serialize(): ApmFields[] {
    const transaction = super.serialize();
    const metric = this.metric.serialize();
    return [...transaction, ...metric];
  }
}
