/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OtelLog } from '../otel_logs';

/** An EDOT Browser log record; the SDK observes it at the time it is emitted. */
export class EdotBrowserLog extends OtelLog {
  timestamp(time: number) {
    super.timestamp(time);
    this.fields.observed_timestamp = time;
    return this;
  }

  /** Links the record to a span, like resource timing entries of instrumented fetch/XHR calls. */
  traceContext({ traceId, spanId }: { traceId: string; spanId: string }) {
    this.fields.trace_id = traceId;
    this.fields.span_id = spanId;
    return this;
  }
}
