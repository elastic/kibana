/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';
import { Serializable } from '../serializable';

export type SyntheticsMonitorDocument = Fields &
  Partial<{
    'data_stream.namespace': string;
    'data_stream.type': string;
    'data_stream.dataset': string;
    'monitor.id': string;
    'monitor.origin': string;
    'monitor.name': string;
    'monitor.type': string;
    'monitor.check_group': string;
    'monitor.timespan.lt': string;
    'monitor.timespan.gte': string;
    'monitor.duration.us'?: number;
    'monitor.ip'?: string;
    'monitor.project.name'?: string;
    'monitor.project.id'?: string;
    'monitor.fleet_managed'?: boolean;
    'monitor.status'?: string;
    'synthetics.type'?: string;
    'synthetics.step.index'?: number;
    'observer.os.name'?: string;
    'observer.product'?: string;
  }>;

type MonitorDataStream =
  | 'http'
  | 'tcp'
  | 'icmp'
  | 'browser'
  | 'browser.screenshot'
  | 'browser.network';

class SyntheticsMonitor extends Serializable<SyntheticsMonitorDocument> {
  constructor(fields: SyntheticsMonitorDocument) {
    super({
      ...fields,
    });
  }

  namespace(value: string) {
    this.fields['data_stream.namespace'] = value;
    return this;
  }

  dataset(value: MonitorDataStream) {
    this.fields['data_stream.dataset'] = value;

    if (value === 'browser.screenshot' || value === 'browser.network') {
      this.fields['monitor.type'] = 'browser';
      return this;
    }

    this.fields['monitor.type'] = value;
    return this;
  }

  name(value: string) {
    this.fields['monitor.name'] = value;
    return this;
  }

  origin(value: string) {
    this.fields['monitor.origin'] = value;
    return this;
  }

  ip(value: string) {
    this.fields['monitor.ip'] = value;
    return this;
  }

  status(value: string) {
    this.fields['monitor.status'] = value;
    return this;
  }

  timestamp(time: number) {
    super.timestamp(time);
    return this;
  }
}

function create(): SyntheticsMonitor {
  return new SyntheticsMonitor({
    'data_stream.namespace': 'default',
    'data_stream.type': 'synthetics',
  }).dataset('http');
}

export const syntheticsMonitor = {
  create,
};
