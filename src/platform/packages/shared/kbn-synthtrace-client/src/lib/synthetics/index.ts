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
    'monitor.interval'?: number;
    'synthetics.type'?: string;
    'synthetics.step.index'?: number;
    'observer.os.name'?: string;
    'observer.product'?: string;
    'observer.name'?: string;
    'observer.geo.name'?: string;
    config_id?: string;
    'meta.space_id'?: string;
    tags?: string[];
    'summary.up'?: number;
    'summary.down'?: number;
    'summary.final_attempt'?: boolean;
    'state.id'?: string;
    'state.up'?: number;
    'state.down'?: number;
    'state.checks'?: number;
    'state.status'?: string;
    'state.started_at'?: string;
    'state.duration_ms'?: number;
    'url.full'?: string;
    'url.domain'?: string;
    'error.message'?: string;
    'error.type'?: string;
    'agent.type'?: string;
    'http.response.status_code'?: number;
    'http.response.body.content'?: string;
    'http.response.body.bytes'?: number;
    'http.response.body.content_bytes'?: number;
  }>;

type MonitorDataStream =
  | 'http'
  | 'tcp'
  | 'icmp'
  | 'browser'
  | 'browser.screenshot'
  | 'browser.network';

// Handles URLs ('https://a.com/x') and tcp/icmp targets ('db.example.com:5432') alike.
const getDomain = (value: string): string => value.replace(/^[a-z]+:\/\//i, '').split(/[/:]/)[0];

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

  configId(value: string) {
    this.fields.config_id = value;
    return this;
  }

  spaceId(value: string) {
    this.fields['meta.space_id'] = value;
    return this;
  }

  tags(value: string[]) {
    this.fields.tags = value;
    return this;
  }

  interval(seconds: number) {
    this.fields['monitor.interval'] = seconds;
    return this;
  }

  location({ id, label }: { id: string; label: string }) {
    this.fields['observer.name'] = id;
    this.fields['observer.geo.name'] = label;
    return this;
  }

  url(value: string) {
    this.fields['url.full'] = value;
    this.fields['url.domain'] = getDomain(value);
    return this;
  }

  /** The response of an http check: its status code, headers and, optionally, its body. */
  httpResponse({
    statusCode,
    headers = {},
    body,
  }: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: string;
  }) {
    this.fields['http.response.status_code'] = statusCode;
    // One flat key per header, for example 'http.response.headers.Content-Type'. The header
    // names are not known in advance, so they are not part of the document type.
    const fields: Record<string, unknown> = this.fields;
    Object.entries(headers).forEach(([name, value]) => {
      fields[`http.response.headers.${name}`] = value;
    });
    if (body !== undefined) {
      const bytes = Buffer.byteLength(body);
      this.fields['http.response.body.content'] = body;
      this.fields['http.response.body.bytes'] = bytes;
      this.fields['http.response.body.content_bytes'] = bytes;
    }
    return this;
  }

  error({ message, type }: { message: string; type: string }) {
    this.fields['error.message'] = message;
    this.fields['error.type'] = type;
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
