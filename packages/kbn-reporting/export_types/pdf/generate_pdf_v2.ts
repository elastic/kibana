/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';

import type { LocatorParams, ReportingServerInfo } from '@kbn/reporting-common/types';
import type { TaskPayloadPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import type { PdfScreenshotOptions, PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import type { UrlOrUrlWithContext } from '@kbn/screenshotting-plugin/server/screenshots';
import { type ReportingConfigType, getFullRedirectAppUrl } from '@kbn/reporting-server';

import { getTracker } from './pdf_tracker';

interface PdfResult {
  buffer: Uint8Array | null;
  metrics?: PdfScreenshotResult['metrics'];
  warnings: string[];
}

type GetScreenshotsFn = (options: PdfScreenshotOptions) => Observable<PdfScreenshotResult>;

export function generatePdfObservableV2(
  config: ReportingConfigType,
  serverInfo: ReportingServerInfo,
  getScreenshots: GetScreenshotsFn,
  job: TaskPayloadPDFV2,
  locatorParams: LocatorParams[],
  options: Omit<PdfScreenshotOptions, 'urls'>
): Observable<PdfResult> {
  const tracker = getTracker();
  tracker.startScreenshots();

  /**
   * For each locator we get the relative URL to the redirect app
   */
  const urls = locatorParams.map((locator) => [
    getFullRedirectAppUrl(config, serverInfo, job.spaceId, job.forceNow),
    locator,
  ]) as unknown as UrlOrUrlWithContext[];

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
