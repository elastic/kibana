/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { catchError, map, mergeMap, of, takeUntil, tap } from 'rxjs';
import { Writable } from 'stream';

import { Headers } from '@kbn/core/server';
import {
  CancellationToken,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
} from '@kbn/reporting-common';
import { REPORTING_TRANSACTION_TYPE } from '@kbn/reporting-server';
import type { TaskInstanceFields, TaskRunResult } from '@kbn/reporting-common/types';
import type { TaskPayloadPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import {
  JobParamsPDFV2,
  PDF_JOB_TYPE_V2,
  PDF_REPORT_TYPE_V2,
} from '@kbn/reporting-export-types-pdf-common';
import { ExportType, decryptJobHeaders, getFullRedirectAppUrl } from '@kbn/reporting-server';
import type { UrlOrUrlWithContext } from '@kbn/screenshotting-plugin/server/screenshots';

import { getCustomLogo } from './get_custom_logo';
import { getTracker } from './pdf_tracker';

export class PdfExportType extends ExportType<JobParamsPDFV2, TaskPayloadPDFV2> {
  id = PDF_REPORT_TYPE_V2;
  name = 'PDF';
  jobType = PDF_JOB_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'pdf' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('pdf-export-v2');
  }

  /**
   * @param JobParamsPDFV2
   * @returns jobParams
   */
  public createJob = async ({ locatorParams, ...jobParams }: JobParamsPDFV2) => {
    return {
      ...jobParams,
      locatorParams,
      isDeprecated: false,
      browserTimezone: jobParams.browserTimezone,
      forceNow: new Date().toISOString(),
    };
  };

  /**
   *
   * @param jobId
   * @param payload
   * @param cancellationToken
   * @param stream
   */
  public runTask = (
    jobId: string,
    payload: TaskPayloadPDFV2,
    taskInstanceFields: TaskInstanceFields,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const logger = this.logger.get(`execute-job:${jobId}`);
    const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans.startSpan('get-assets', 'setup');
    let apmGeneratePdf: { end: () => void } | null | undefined;
    const { encryptionKey } = this.config;

    const process$: Rx.Observable<TaskRunResult> = of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, payload.headers, logger)),
      mergeMap(async (headers: Headers) => {
        const fakeRequest = this.getFakeRequest(headers, payload.spaceId, logger);
        const uiSettingsClient = await this.getUiSettingsClient(fakeRequest);
        return await getCustomLogo(uiSettingsClient, headers);
      }),
      mergeMap(({ logo, headers }) => {
        const { browserTimezone, layout, title, locatorParams } = payload;

        apmGetAssets?.end();

        apmGeneratePdf = apmTrans.startSpan('generate-pdf-pipeline', 'execute');

        const tracker = getTracker();
        tracker.startScreenshots();

        /**
         * For each locator we get the relative URL to the redirect app
         */
        const urls = locatorParams.map((locator) => [
          getFullRedirectAppUrl(
            this.config,
            this.getServerInfo(),
            payload.spaceId,
            payload.forceNow
          ),
          locator,
        ]) as unknown as UrlOrUrlWithContext[];

        return this.startDeps
          .screenshotting!.getScreenshots({
            format: 'pdf',
            title,
            logo,
            browserTimezone,
            headers,
            layout,
            urls: urls.map((url) =>
              typeof url === 'string'
                ? url
                : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
            ),
            taskInstanceFields,
            logger,
          })
          .pipe(
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
      }),
      tap(({ buffer }) => {
        apmGeneratePdf?.end();

        if (buffer) {
          stream.write(buffer);
        }
      }),
      map(({ metrics, warnings }) => ({
        content_type: 'application/pdf',
        metrics: { pdf: metrics },
        warnings,
      })),
      catchError((err) => {
        logger.error(err);
        return Rx.throwError(() => err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);

    apmTrans.end();
    return Rx.firstValueFrom(process$.pipe(takeUntil(stop$)));
  };
}
