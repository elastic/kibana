/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import { withActiveSpan } from '@kbn/tracing-utils';
import type { Observable } from 'rxjs';
import { fromEventPattern, lastValueFrom, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, takeUntil, tap } from 'rxjs';

import type { LicenseType } from '@kbn/licensing-types';
import {
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type {
  JobParamsPDFDeprecated,
  TaskPayloadPDF,
} from '@kbn/reporting-export-types-pdf-common';
import { PDF_JOB_TYPE } from '@kbn/reporting-export-types-pdf-common';
import type { RunTaskOpts } from '@kbn/reporting-server';
import { ExportType, REPORTING_TRANSACTION_TYPE } from '@kbn/reporting-server';

import { getCustomLogo } from './get_custom_logo';
import { getFullUrls } from './get_full_urls';
import { getTracker } from './pdf_tracker';
import { validateUrls } from './validate_urls';

/**
 * @deprecated
 */
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

  public runTask = async ({
    jobId,
    payload: job,
    request,
    taskInstanceFields,
    cancellationToken,
    stream,
  }: RunTaskOpts<TaskPayloadPDF>) => {
    return withActiveSpan(
      'execute-job-pdf',
      { attributes: { 'transaction.type': REPORTING_TRANSACTION_TYPE } },
      async () => {
        const logger = this.logger.get('execute-job');
        const apmTrans = apm.startTransaction('execute-job-pdf', REPORTING_TRANSACTION_TYPE);
        const apmGetAssets = apmTrans.startSpan('get-assets', 'setup');
        let apmGeneratePdf: { end: () => void } | null | undefined;

        const tracker = getTracker();

        const process$: Observable<TaskRunResult> = of(1).pipe(
          mergeMap(() =>
            withActiveSpan('get-assets', { attributes: { 'span.type': 'setup' } }, async () => {
              const uiSettingsClient = await this.getUiSettingsClient(request);
              const logo = await getCustomLogo(uiSettingsClient);
              const urls = getFullUrls(this.getServerInfo(), this.config, job);
              const { browserTimezone, layout, title } = job;
              return { logo, urls, browserTimezone, layout, title };
            })
          ),
          tap(() => apmGetAssets?.end()),
          mergeMap(({ logo, urls, browserTimezone, layout, title }) => {
            apmGeneratePdf = apmTrans.startSpan('generate-pdf-pipeline', 'execute');

            // "generate-pdf-pipeline" and "generate-pdf" (from withGeneratePdfSpan) cover the same span.
            // The difference is that the legacy Elastic APM agent only supports 1-deep nested spans.
            // With OTel this seems like unnecessary duplication, but we keep it for compatibility.
            return withActiveSpan(
              'generate-pdf-pipeline',
              { attributes: { 'span.type': 'execute' } },
              () =>
                tracker.withGeneratePdfSpan(() =>
                  tracker
                    .withScreenshotsSpan(() =>
                      this.startDeps.screenshotting!.getScreenshots({
                        format: 'pdf',
                        title,
                        logo,
                        urls,
                        request,
                        browserTimezone,
                        layout,
                        taskInstanceFields,
                        logger,
                      })
                    )
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
                    )
                )
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
          catchError((err: any) => {
            logger.debug(err, { tags: [jobId] });
            return throwError(err);
          })
        );

        const stop$ = fromEventPattern(cancellationToken.on);

        apmTrans.end();
        return lastValueFrom(process$.pipe(takeUntil(stop$)));
      }
    );
  };
}
