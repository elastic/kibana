import type { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { BaseParams, JobId, ManagementLinkFn, ScheduledReportApiJSON } from '@kbn/reporting-common/types';
import type { ReactElement } from 'react';
import { Job } from '.';
type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;
export interface DiagnoseResponse {
    help: string[];
    success: boolean;
    logs: string;
}
interface IReportingAPI {
    getReportURL(jobId: string): string;
    getReportingPublicJobPath<T>(exportType: string, jobParams: BaseParams & T): string;
    createReportingJob<T>(exportType: string, jobParams: BaseParams & T): Promise<Job | undefined | ReactElement>;
    getServerBasePath(): string;
    downloadReport(jobId: string): void;
    deleteReport(jobId: string): Promise<void>;
    list(page: number, perPage: number, jobIds: string[]): Promise<Job[]>;
    total(): Promise<number>;
    getError(jobId: string): Promise<string>;
    getInfo(jobId: string): Promise<Job>;
    findForJobIds(jobIds: string[]): Promise<Job[]>;
    getManagementLink: ManagementLinkFn;
    verifyBrowser(): Promise<DiagnoseResponse>;
    verifyScreenCapture(): Promise<DiagnoseResponse>;
}
/**
 * Client class for interacting with Reporting APIs
 * @implements IReportingAPI
 */
export declare class ReportingAPIClient implements IReportingAPI {
    private uiSettings;
    private kibanaVersion;
    private http;
    private addPendingJobId;
    constructor(http: HttpSetup, uiSettings: IUiSettingsClient, kibanaVersion: string);
    getKibanaAppHref(job: Job): string;
    /**
     * Get the internal URL
     */
    getReportURL(jobId: string): string;
    downloadReport(jobId: string): void;
    deleteReport(jobId: string): Promise<void>;
    list(page?: number, perPage?: number, jobIds?: string[]): Promise<Job[]>;
    total(): Promise<number>;
    getError(jobId: string): Promise<string>;
    getInfo(jobId: string): Promise<Job>;
    getScheduledReportInfo(id: string, page?: number, perPage?: number): Promise<ScheduledReportApiJSON | undefined>;
    findForJobIds(jobIds: JobId[]): Promise<Job[]>;
    /**
     * Returns a string for the public API endpoint used to automate the generation of reports
     * This string must be shown when the user selects the option to view/copy the POST URL
     */
    getReportingPublicJobPath(exportType: string, jobParams: BaseParams): string;
    createReportingShareJob(exportType: string, jobParams: BaseParams): Promise<Job | undefined>;
    /**
     * Calls the internal API to generate a report job on-demand
     */
    createReportingJob(exportType: string, jobParams: BaseParams): Promise<Job | undefined>;
    /**
     * Adds the browserTimezone and kibana version to report job params
     */
    getDecoratedJobParams<T extends AppParams>(baseParams: T): BaseParams;
    getManagementLink: ManagementLinkFn;
    getDownloadLink: (jobId: JobId) => string;
    getServerBasePath: () => string;
    verifyBrowser(): Promise<DiagnoseResponse>;
    verifyScreenCapture(): Promise<DiagnoseResponse>;
    migrateReportingIndicesIlmPolicy(): Promise<unknown>;
}
export {};
