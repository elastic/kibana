/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import { Observable } from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';

import type { Logger } from '@kbn/logging';
import { REPORTING_TRANSACTION_TYPE } from '@kbn/reporting-common/constants';
import type { PngScreenshotOptions, PngScreenshotResult } from '@kbn/screenshotting-plugin/server';

interface PngResult {
  buffer: Buffer;
  metrics?: PngScreenshotResult['metrics'];
  warnings: string[];
}

type GetScreenshotsFn = (options: PngScreenshotOptions) => Observable<PngScreenshotResult>;

export function generatePngObservable(
  getScreenshots: GetScreenshotsFn,
  logger: Logger,
  options: Omit<PngScreenshotOptions, 'format'>
): Observable<PngResult> {
  const apmTrans = apm.startTransaction('generate-png', REPORTING_TRANSACTION_TYPE);
  if (!options.layout?.dimensions) {
    throw new Error(`LayoutParams.Dimensions is undefined.`);
  }

  const apmScreenshots = apmTrans?.startSpan('screenshots-pipeline', 'setup');
  let apmBuffer: typeof apm.currentSpan;

  return getScreenshots({
    ...options,
    format: 'png',
    layout: { id: 'preserve_layout', ...options.layout },
  }).pipe(
    tap(({ metrics }) => {
      if (metrics) {
        apmTrans.setLabel('cpu', metrics.cpu, false);
        apmTrans.setLabel('memory', metrics.memory, false);
      }
      apmScreenshots?.end();
      apmBuffer = apmTrans.startSpan('get-buffer', 'output') ?? null;
    }),
    map(({ metrics, results }) => ({
      metrics,
      buffer: results[0].screenshots[0].data,
      warnings: results.reduce((found, current) => {
        if (current.error) {
          found.push(current.error.message);
        }
        if (current.renderErrors) {
          found.push(...current.renderErrors);
        }
        return found;
      }, [] as string[]),
    })),
    tap(({ buffer }) => {
      logger.debug(`PNG buffer byte length: ${buffer.byteLength}`);
      apmTrans.setLabel('byte-length', buffer.byteLength, false);
    }),
    finalize(() => {
      apmBuffer?.end();
      apmTrans.end();
    })
  );
}
