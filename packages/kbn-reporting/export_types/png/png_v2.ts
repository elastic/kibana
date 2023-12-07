/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import {
  finalize,
  fromEventPattern,
  lastValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  takeUntil,
  tap,
} from 'rxjs';
import { Writable } from 'stream';

import type { LicenseType } from '@kbn/licensing-plugin/server';
import {
  CancellationToken,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
  REPORTING_TRANSACTION_TYPE,
} from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import {
  JobParamsPNGV2,
  PNG_JOB_TYPE_V2,
  PNG_REPORT_TYPE_V2,
  TaskPayloadPNGV2,
} from '@kbn/reporting-export-types-png-common';
import { decryptJobHeaders, getFullRedirectAppUrl, ExportType } from '@kbn/reporting-server';

import { generatePngObservable } from './generate_png';

export class PngExportType extends ExportType<JobParamsPNGV2, TaskPayloadPNGV2> {
  id = PNG_REPORT_TYPE_V2;
  name = 'PNG';
  jobType = PNG_JOB_TYPE_V2;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'png' as const;
  validLicenses: LicenseType[] = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('png-export-v2');
  }

  /**
   * @params JobParamsPNGV2
   * @returns jobParams
   */
  public createJob = async ({ locatorParams, ...jobParams }: JobParamsPNGV2) => {
    return {
      ...jobParams,
      locatorParams: [locatorParams],
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
    payload: TaskPayloadPNGV2,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const jobLogger = this.logger.get(`execute-job:${jobId}`);
    const apmTrans = apm.startTransaction('execute-job-pdf-v2', REPORTING_TRANSACTION_TYPE);
    const apmGetAssets = apmTrans.startSpan('get-assets', 'setup');
    let apmGeneratePng: { end: () => void } | null | undefined;
    const { encryptionKey } = this.config;

    const process$: Observable<TaskRunResult> = of(1).pipe(
      mergeMap(() => decryptJobHeaders(encryptionKey, payload.headers, jobLogger)),
      mergeMap((headers) => {
        const url = getFullRedirectAppUrl(
          this.config,
          this.getServerInfo(),
          payload.spaceId,
          payload.forceNow
        );

        const [locatorParams] = payload.locatorParams;

        apmGetAssets?.end();
        apmGeneratePng = apmTrans.startSpan('generate-png-pipeline', 'execute');

        return generatePngObservable(
          () =>
            this.startDeps.screenshotting!.getScreenshots({
              format: 'png',
              headers,
              layout: { ...payload.layout, id: 'preserve_layout' },
              urls: [[url, { [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: locatorParams }]],
            }),
          jobLogger,
          {
            headers,
            browserTimezone: payload.browserTimezone,
            layout: { ...payload.layout, id: 'preserve_layout' },
          }
        );
      }),
      tap(({ buffer }) => stream.write(buffer)),
      map(({ metrics, warnings }) => ({
        content_type: 'image/png',
        metrics: { png: metrics },
        warnings,
      })),
      tap({ error: (error) => jobLogger.error(error) }),
      finalize(() => apmGeneratePng?.end())
    );

    const stop$ = fromEventPattern(cancellationToken.on);
    return lastValueFrom(process$.pipe(takeUntil(stop$)));
  };
}
