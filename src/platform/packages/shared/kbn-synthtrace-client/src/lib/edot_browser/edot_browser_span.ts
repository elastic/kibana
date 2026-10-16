/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '../entity';
import type { OtelScope } from '../otel_logs';
import { Serializable } from '../serializable';

export type EdotBrowserSpanDocument = Fields & {
  _index?: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  kind: 'Client';
  /** Span duration in nanoseconds. */
  duration?: number;
  status: { code: 'Unset' | 'Error' };
  attributes: Record<string, unknown>;
  resource: { attributes: Record<string, unknown> };
  scope: OtelScope;
};

/**
 * OTel-native CLIENT span as stored by the Elasticsearch exporter. Unlike `OtelSpan`, it carries
 * no APM-specific fields and is not meant to go through the APM OTel pipeline.
 */
export class EdotBrowserSpan extends Serializable<EdotBrowserSpanDocument> {
  duration(durationMs: number) {
    this.fields.duration = Math.round(durationMs * 1_000_000);
    return this;
  }
}
