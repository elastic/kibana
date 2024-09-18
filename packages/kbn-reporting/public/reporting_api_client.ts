/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM } from '@kbn/core-http-common';
import type { HttpFetchQuery } from '@kbn/core/public';
import { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  INTERNAL_ROUTES,
  PUBLIC_ROUTES,
  REPORTING_MANAGEMENT_HOME,
  buildKibanaPath,
  REPORTING_REDIRECT_APP,
} from '@kbn/reporting-common';
import { BaseParams, JobId, ManagementLinkFn, ReportApiJSON } from '@kbn/reporting-common/types';
import rison from '@kbn/rison';
import moment from 'moment';
import { stringify } from 'query-string';
import { ReactElement } from 'react';
import { Job } from '.';
import { jobCompletionNotifications } from './job_completion_notifications';

/*
 * For convenience, apps do not have to provide the browserTimezone and Kibana version.
 * Those fields are added in this client as part of the service.
 * TODO: export a type like this to other plugins: https://github.com/elastic/kibana/issues/107085
 */
type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

export interface DiagnoseResponse {
  help: string[];
  success: boolean;
  logs: string;
}

interface IReportingAPI {
  // Helpers
  getReportURL(jobId: string): string;
  getReportingPublicJobPath<T>(exportType: string, jobParams: BaseParams & T): string; // Return a URL to queue a job, with the job params encoded in the query string of the URL. Used for copying POST URL
  createReportingJob<T>(
    exportType: string,
    jobParams: BaseParams & T
  ): Promise<Job | undefined | ReactElement>; // Sends a request to queue a job, with the job params in the POST body
  getServerBasePath(): string; // Provides the raw server basePath to allow it to be stripped out from relativeUrls in job params

  // CRUD
  downloadReport(jobId: string): void;
  deleteReport(jobId: string): Promise<void>;
  list(page: number, jobIds: string[]): Promise<Job[]>; // gets the first 10 report of the page
  total(): Promise<number>;
  getError(jobId: string): Promise<string>;
  getInfo(jobId: string): Promise<Job>;
  findForJobIds(jobIds: string[]): Promise<Job[]>;

  // Function props
  getManagementLink: ManagementLinkFn;

  // Diagnostic-related API calls
  verifyBrowser(): Promise<DiagnoseResponse>;
  verifyScreenCapture(): Promise<DiagnoseResponse>;
}

/**
 * Client class for interacting with Reporting APIs
 * @implements IReportingAPI
 */
export class ReportingAPIClient implements IReportingAPI {
  private http: HttpSetup;
  private addPendingJobId = jobCompletionNotifications().addPendingJobId;

  constructor(
    http: HttpSetup,
    private uiSettings: IUiSettingsClient,
    private kibanaVersion: string
  ) {
    this.http = http;
  }

  public getKibanaAppHref(job: Job): string {
    const searchParams = stringify({ jobId: job.id });

    const path = buildKibanaPath({
      basePath: this.http.basePath.serverBasePath,
      spaceId: job.spaceId,
      appPath: REPORTING_REDIRECT_APP,
    });

    const href = `${path}?${searchParams}`;
    return href;
  }

  /**
   * Get the internal URL
   */
  public getReportURL(jobId: string) {
    const downloadLink = this.http.basePath.prepend(
      `${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/${jobId}?${ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM}=true`
    );

    return downloadLink;
  }

  public downloadReport(jobId: string) {
    const location = this.getReportURL(jobId);

    window.open(location);
  }

  public async deleteReport(jobId: string) {
    return await this.http.delete<void>(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${jobId}`);
  }

  public async list(page = 0, jobIds: string[] = []) {
    const query: HttpFetchQuery = { page };
    if (jobIds.length > 0) {
      // Only getting the first 10, to prevent URL overflows
      query.ids = jobIds.slice(0, 10).join(',');
    }

    const jobQueueEntries: ReportApiJSON[] = await this.http.get(INTERNAL_ROUTES.JOBS.LIST, {
      query,
      asSystemRequest: true,
    });

    return jobQueueEntries.map((report) => new Job(report));
  }

  public async total() {
    return await this.http.get<number>(INTERNAL_ROUTES.JOBS.COUNT, {
      asSystemRequest: true,
    });
  }

  public async getError(jobId: string) {
    const job = await this.getInfo(jobId);

    if (job.warnings?.[0]) {
      // the error message of a failed report is a singular string in the warnings array
      return job.warnings[0];
    }

    return i18n.translate('reporting.apiClient.unknownError', {
      defaultMessage: `Report job {job} failed. Error unknown.`,
      values: { job: jobId },
    });
  }

  public async getInfo(jobId: string) {
    const report: ReportApiJSON = await this.http.get(
      `${INTERNAL_ROUTES.JOBS.INFO_PREFIX}/${jobId}`
    );
    return new Job(report);
  }

  public async findForJobIds(jobIds: JobId[]) {
    const reports: ReportApiJSON[] = await this.http.fetch(INTERNAL_ROUTES.JOBS.LIST, {
      query: { page: 0, ids: jobIds.join(',') },
      method: 'GET',
    });
    return reports.map((report) => new Job(report));
  }

  /**
   * Returns a string for the public API endpoint used to automate the generation of reports
   * This string must be shown when the user selects the option to view/copy the POST URL
   */
  public getReportingPublicJobPath(exportType: string, jobParams: BaseParams) {
    const params = stringify({
      jobParams: rison.encode(jobParams),
    });
    return `${this.http.basePath.prepend(PUBLIC_ROUTES.GENERATE_PREFIX)}/${exportType}?${params}`;
  }

  public async createReportingShareJob(exportType: string, jobParams: BaseParams) {
    const jobParamsRison = rison.encode(jobParams);
    const resp: { job?: ReportApiJSON } | undefined = await this.http.post(
      `${INTERNAL_ROUTES.GENERATE_PREFIX}/${exportType}`,
      {
        method: 'POST',
        body: JSON.stringify({ jobParams: jobParamsRison }),
      }
    );
    if (resp?.job) {
      this.addPendingJobId(resp.job.id);
      return new Job(resp.job);
    }
  }
  /**
   * Calls the internal API to generate a report job on-demand
   */
  public async createReportingJob(exportType: string, jobParams: BaseParams) {
    const jobParamsRison = rison.encode(jobParams);
    try {
      const resp: { job?: ReportApiJSON } | undefined = await this.http.post(
        `${INTERNAL_ROUTES.GENERATE_PREFIX}/${exportType}`,
        {
          method: 'POST',
          body: JSON.stringify({ jobParams: jobParamsRison }),
        }
      );
      if (resp?.job) {
        this.addPendingJobId(resp.job.id);
        return new Job(resp.job);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      throw new Error(`${err.body?.message}`);
    }
  }

  /**
   * @deprecated
   * Requires `xpack.reporting.csv.enablePanelActionDownload` set to `true` (default is false)
   */
  public async createImmediateReport(baseParams: BaseParams) {
    const { objectType: _objectType, ...params } = baseParams; // objectType is not needed for immediate download api
    return this.http.post(INTERNAL_ROUTES.DOWNLOAD_CSV, {
      asResponse: true,
      body: JSON.stringify(params),
    });
  }

  public getDecoratedJobParams<T extends AppParams>(baseParams: T): BaseParams {
    // If the TZ is set to the default "Browser", it will not be useful for
    // server-side export. We need to derive the timezone and pass it as a param
    // to the export API.
    const browserTimezone: string =
      this.uiSettings.get('dateFormat:tz') === 'Browser'
        ? moment.tz.guess()
        : this.uiSettings.get('dateFormat:tz');

    return {
      browserTimezone,
      version: this.kibanaVersion,
      ...baseParams,
    };
  }

  public getManagementLink: ManagementLinkFn = () =>
    this.http.basePath.prepend(REPORTING_MANAGEMENT_HOME);

  public getDownloadLink = (jobId: JobId) => this.getReportURL(jobId);

  public getServerBasePath = () => this.http.basePath.serverBasePath;

  public verifyBrowser() {
    return this.http.get<DiagnoseResponse>(INTERNAL_ROUTES.DIAGNOSE.BROWSER);
  }

  public verifyScreenCapture() {
    return this.http.post<DiagnoseResponse>(INTERNAL_ROUTES.DIAGNOSE.SCREENSHOT);
  }

  public migrateReportingIndicesIlmPolicy() {
    return this.http.put(INTERNAL_ROUTES.MIGRATE.MIGRATE_ILM_POLICY);
  }
}
