/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';
import * as Rx from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';
import { PngScreenshotResult } from '@kbn/screenshotting-plugin/server';
import { REPORTING_TRANSACTION_TYPE } from '../../../common/constants';
import type { PngMetrics } from '../../../common/types';
import type { PngScreenshotOptions } from '../../types';

interface PngResult {
  buffer: Buffer;
  metrics?: PngMetrics;
  warnings: string[];
}

type GetScreenshotsFn = (options: PngScreenshotOptions) => Rx.Observable<PngScreenshotResult>;

export function generatePngObservable(
  getScreenshots: GetScreenshotsFn,
  logger: Logger,
  options: Omit<PngScreenshotOptions, 'format'>
): Rx.Observable<PngResult> {
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
        apmTrans?.setLabel('cpu', metrics.cpu, false);
        apmTrans?.setLabel('memory', metrics.memory, false);
      }
      apmScreenshots?.end();
      apmBuffer = apmTrans?.startSpan('get-buffer', 'output') ?? null;
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
      apmTrans?.setLabel('byte-length', buffer.byteLength, false);
    }),
    finalize(() => {
      apmBuffer?.end();
      apmTrans?.end();
    })
  );
}
