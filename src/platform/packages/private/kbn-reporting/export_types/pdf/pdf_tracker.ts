/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm, { type Span as ApmSpan, type Transaction as ApmTransaction } from 'elastic-apm-node';
import { type Span as OtelSpan } from '@opentelemetry/api';
import { withActiveSpan } from '@kbn/tracing-utils';
import { tap, type Observable } from 'rxjs';

interface PdfTracker {
  setCpuUsage: (cpu: number) => void;
  setMemoryUsage: (memory: number) => void;
  withGeneratePdfSpan: <T>(fn: () => Observable<T>) => Observable<T>;
  withScreenshotsSpan: <T>(fn: () => Observable<T>) => Observable<T>;
}

const TRANSACTION_TYPE = 'reporting';
const SPANTYPE_SETUP = 'setup';

export function getTracker(): PdfTracker {
  let apmTrans: ApmTransaction | null = null;
  let apmScreenshots: ApmSpan | null = null;
  let otelSpan: OtelSpan | undefined;

  return {
    withGeneratePdfSpan<T>(fn: () => Observable<T>) {
      apmTrans = apm.startTransaction('generate-pdf', TRANSACTION_TYPE);
      return withActiveSpan(
        'generate-pdf',
        { attributes: { 'transaction.type': TRANSACTION_TYPE } },
        (span) => {
          otelSpan = span;
          return fn();
        }
      ).pipe(tap(() => apmTrans?.end()));
    },
    withScreenshotsSpan<T>(fn: () => Observable<T>) {
      apmScreenshots = apmTrans?.startSpan('screenshots-pipeline', SPANTYPE_SETUP) || null;
      return withActiveSpan(
        'screenshots-pipeline',
        { attributes: { 'span.type': SPANTYPE_SETUP } },
        fn
      ).pipe(tap(() => apmScreenshots?.end()));
    },
    setCpuUsage(cpu: number) {
      apmTrans?.setLabel('cpu', cpu, false);
      otelSpan?.setAttribute('cpu', cpu);
    },
    setMemoryUsage(memory: number) {
      apmTrans?.setLabel('memory', memory, false);
      otelSpan?.setAttribute('memory', memory);
    },
  };
}
