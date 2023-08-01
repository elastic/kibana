/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LicenseType } from '@kbn/licensing-plugin/server';
import {
  CancellationToken,
  decryptJobHeaders,
  ExportType,
  generatePdfObservable,
  getCustomLogo,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  PDF_JOB_TYPE,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_TRANSACTION_TYPE,
  TaskRunResult,
  validateUrls,
  getFullUrls,
} from '@kbn/reporting-common';
import { Writable } from 'stream';
import apm from 'elastic-apm-node';
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs/operators';
import { fromEventPattern, lastValueFrom, Observable, of, throwError } from 'rxjs';
import type { PdfScreenshotOptions, PdfScreenshotResult } from '@kbn/screenshotting-plugin/server';
import { BaseParams, TaskPayloadPDF } from '@kbn/reporting-common/types';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';

interface BaseParamsPDF {
  layout: LayoutParams;
  relativeUrls: string[];
  isDeprecated?: boolean;
}

// Job params: structure of incoming user request data, after being parsed from RISON

/**
 * @deprecated
 */
export type JobParamsPDFDeprecated = BaseParamsPDF & BaseParams;
export class PdfV1ExportType extends ExportType<JobParamsPDFDeprecated, TaskPayloadPDF> {
  id = 'printablePdf';
  name = 'PDF';
  jobType = PDF_JOB_TYPE;
  jobContentEncoding? = 'base64' as const;
  jobContentExtension = 'pdf' as const;
  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('png-export-v1');
  }

  public getScreenshots(options: PdfScreenshotOptions): Observable<PdfScreenshotResult> {
    return this.startDeps.screenshotting.getScreenshots({
      ...options,
      urls: options?.urls?.map((url) =>
        typeof url === 'string' ? url : [url[0], { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: url[1] }]
      ),
    });
  }

  public createJob = async (
    { relativeUrls, ...jobParams }: JobParamsPDFDeprecated // relativeUrls does not belong in the payload of PDFV1
  ) => {
    validateUrls(relativeUrls);

    // return the payload
    return {
      ...jobParams,
      isDeprecated: true,
      forceNow: new Date().toISOString(),
      objects: relativeUrls.map((u) => ({ relativeUrl: u })),
    };
  };

  public runTask = async (
    jobId: string,
    job: TaskPayloadPDF,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const jobLogger = this.logger.get(`execute-job:${jobId}`);
    const apmTrans = apm.startTransaction('execute-job-pdf', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans?.startSpan('get-assets', 'setup');
    let apmGeneratePdf: { end: () => void } | null | undefined;

    const process$: Observable<TaskRunResult> = of(1).pipe(
      mergeMap(() => decryptJobHeaders(this.config.encryptionKey, job.headers, jobLogger)),
      mergeMap(async (headers) => {
        const fakeRequest = this.getFakeRequest(headers, job.spaceId, jobLogger);
        const uiSettingsClient = await this.getUiSettingsClient(fakeRequest);
        return getCustomLogo(uiSettingsClient, headers);
      }),
      mergeMap(({ headers, logo }) => {
        const urls = getFullUrls(this.getServerInfo(), this.config, job);

        const { browserTimezone, layout, title } = job;
        apmGetAssets?.end();

        apmGeneratePdf = apmTrans?.startSpan('generate-pdf-pipeline', 'execute');
        //  make a new function that will call reporting.getScreenshots
        const snapshotFn = () =>
          this.getScreenshots({
            format: 'pdf',
            title,
            logo,
            urls,
            browserTimezone,
            headers,
            layout,
          });
        return generatePdfObservable(snapshotFn, {
          format: 'pdf',
          title,
          logo,
          urls,
          browserTimezone,
          headers,
          layout,
        });
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
      catchError((err: any) => {
        jobLogger.error(err);
        return throwError(err);
      })
    );

    const stop$ = fromEventPattern(cancellationToken.on);

    apmTrans?.end();
    return lastValueFrom(process$.pipe(takeUntil(stop$)));
  };
}
