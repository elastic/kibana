/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';
import type { PdfScreenshotOptions, PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import {
  getFullRedirectAppUrl,
  getTracker,
  ReportingServerInfo,
  TaskPayloadPDFV2,
} from '@kbn/reporting-common-export-types-helpers';
import type { LocatorParams, ReportingConfigType } from '@kbn/reporting-common';
import { PdfMetrics } from '@kbn/reporting-common/metrics';
import type { UrlOrUrlWithContext } from '@kbn/screenshotting-plugin/server/screenshots';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfMetrics;
  warnings: string[];
}

type GetScreenshotsFn = (options: PdfScreenshotOptions) => Rx.Observable<PdfScreenshotResult>;

export function generatePdfObservable(
  config: ReportingConfigType,
  serverInfo: ReportingServerInfo,
  getScreenshots: GetScreenshotsFn,
  job: TaskPayloadPDFV2,
  locatorParams: LocatorParams[],
  options: Omit<PdfScreenshotOptions, 'urls'>
): Rx.Observable<PdfResult> {
  const tracker = getTracker();
  tracker.startScreenshots();

  /**
   * For each locator we get the relative URL to the redirect app
   */
  const urls = locatorParams.map((locator) => [
    getFullRedirectAppUrl(config, serverInfo, job.spaceId, job.forceNow),
    locator,
  ]) as UrlOrUrlLocatorTuple[];
  const screenshots$ = getScreenshots({ ...options, urls }).pipe(
    tap(({ metrics }) => {
      if (metrics.cpu) {
        tracker.setCpuUsage(metrics.cpu);
      }
      if (metrics.memory) {
        tracker.setMemoryUsage(metrics.memory);
      }
    }),
    mergeMap(async ({ data: buffer, errors, metrics, renderErrors }) => {
      tracker.endScreenshots();
      const warnings: string[] = [];
      if (errors) {
        warnings.push(...errors.map((error) => error.message));
      }
      if (renderErrors) {
        warnings.push(...renderErrors);
      }

      return {
        buffer,
        metrics,
        warnings,
      };
    })
  );

  return screenshots$;
}
