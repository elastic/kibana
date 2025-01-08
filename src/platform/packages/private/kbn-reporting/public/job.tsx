/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import React from 'react';

import { EuiText, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JOB_STATUS } from '@kbn/reporting-common';
import type {
  BaseParamsV2,
  JobId,
  ReportApiJSON,
  ReportFields,
  ReportOutput,
  ReportSource,
  TaskRunResult,
} from '@kbn/reporting-common/types';
import { CSV_JOB_TYPE, CSV_JOB_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import { PDF_JOB_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_JOB_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

const jobTypes = [CSV_JOB_TYPE, CSV_JOB_TYPE_V2, PDF_JOB_TYPE_V2, PNG_JOB_TYPE_V2];

type JobTypeDeclaration = typeof jobTypes;
type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];

const { COMPLETED, FAILED, PENDING, PROCESSING, WARNINGS } = JOB_STATUS;

type ReportPayload = ReportSource['payload'];

/*
 * This class represents a report job for the UI
 * It can be instantiated with ReportApiJSON: the response data format for the report job APIs
 */
export class Job {
  public readonly payload: Omit<ReportPayload, 'headers'>;

  public readonly id: JobId;
  public readonly index: string;

  public readonly objectType: ReportPayload['objectType'];
  public readonly title: ReportPayload['title'];
  public readonly isDeprecated: ReportPayload['isDeprecated'];
  public readonly spaceId: ReportPayload['spaceId'];
  public readonly browserTimezone?: ReportPayload['browserTimezone'];
  public readonly layout: ReportPayload['layout']; // png & pdf only
  public readonly pagingStrategy: ReportPayload['pagingStrategy']; // csv only
  public readonly version: ReportPayload['version'];

  public readonly jobtype: ReportSource['jobtype'];
  public readonly created_by: ReportSource['created_by'];
  public readonly created_at: ReportSource['created_at'];
  public readonly started_at: ReportSource['started_at'];
  public readonly completed_at: ReportSource['completed_at'];
  public readonly status: JOB_STATUS; // FIXME: can not use ReportSource['status'] due to type mismatch
  public readonly attempts: ReportSource['attempts'];
  public readonly max_attempts: ReportSource['max_attempts'];

  public readonly timeout: ReportSource['timeout'];
  public readonly kibana_name: ReportSource['kibana_name'];
  public readonly kibana_id: ReportSource['kibana_id'];

  public readonly size?: ReportOutput['size'];
  public readonly content_type?: TaskRunResult['content_type'];
  public readonly csv_contains_formulas?: TaskRunResult['csv_contains_formulas'];
  public readonly max_size_reached?: TaskRunResult['max_size_reached'];
  public readonly metrics?: ReportSource['metrics'];
  public readonly warnings?: TaskRunResult['warnings'];
  public readonly error_code?: ReportOutput['error_code'];

  public readonly locatorParams?: BaseParamsV2['locatorParams'];

  public readonly queue_time_ms?: Required<ReportFields>['queue_time_ms'][number];
  public readonly execution_time_ms?: Required<ReportFields>['execution_time_ms'][number];

  constructor(report: ReportApiJSON) {
    this.id = report.id;
    this.index = report.index;

    this.payload = report.payload;

    this.jobtype = report.jobtype;
    this.objectType = report.payload.objectType;
    this.title = report.payload.title;
    this.layout = report.payload.layout;
    this.pagingStrategy = report.payload.pagingStrategy;
    this.version = report.payload.version;
    this.created_by = report.created_by;
    this.created_at = report.created_at;
    this.started_at = report.started_at;
    this.completed_at = report.completed_at;
    this.status = report.status as JOB_STATUS;
    this.attempts = report.attempts;
    this.max_attempts = report.max_attempts;

    this.timeout = report.timeout;
    this.kibana_name = report.kibana_name;
    this.kibana_id = report.kibana_id;
    this.browserTimezone = report.payload.browserTimezone;
    this.size = report.output?.size;
    this.content_type = report.output?.content_type;

    this.isDeprecated = report.payload.isDeprecated || false;
    this.spaceId = report.payload.spaceId;
    this.csv_contains_formulas = report.output?.csv_contains_formulas;
    this.max_size_reached = report.output?.max_size_reached;
    this.warnings = report.output?.warnings;
    this.error_code = report.output?.error_code;
    this.locatorParams = (report.payload as BaseParamsV2).locatorParams;
    this.metrics = report.metrics;
    this.queue_time_ms = report.queue_time_ms;
    this.execution_time_ms = report.execution_time_ms;
  }

  public isSearch() {
    return this.objectType === 'search';
  }

  getStatusMessage() {
    const status = this.status;
    let smallMessage;
    if (status === PENDING) {
      smallMessage = i18n.translate('reporting.jobStatusDetail.pendingStatusReachedText', {
        defaultMessage: 'Waiting for job to process.',
      });
    } else if (status === PROCESSING) {
      smallMessage = i18n.translate('reporting.jobStatusDetail.attemptXofY', {
        defaultMessage: 'Attempt {attempts} of {max_attempts}.',
        values: { attempts: this.attempts, max_attempts: this.max_attempts },
      });
    } else if (this.getWarnings()) {
      smallMessage = i18n.translate('reporting.jobStatusDetail.warningsText', {
        defaultMessage: 'See report info for warnings.',
      });
    } else if (this.getError()) {
      smallMessage = i18n.translate('reporting.jobStatusDetail.errorText', {
        defaultMessage: 'See report info for error details.',
      });
    }

    let deprecatedMessage: React.ReactElement | undefined;
    if (this.isDeprecated) {
      deprecatedMessage = (
        <EuiText size="s">
          {' '}
          <EuiTextColor color="warning">
            {i18n.translate('reporting.jobStatusDetail.deprecatedText', {
              defaultMessage: `This is a deprecated export type. Automation of this report will need to be re-created for compatibility with future versions of Kibana.`,
            })}
          </EuiTextColor>
        </EuiText>
      );
    }

    if (smallMessage) {
      return (
        <>
          <EuiText size="s">
            <EuiTextColor color="subdued">{smallMessage}</EuiTextColor>
          </EuiText>
          {deprecatedMessage ? deprecatedMessage : null}
        </>
      );
    }

    return null;
  }

  public get prettyStatus(): string {
    return (
      jobStatusLabelsMap.get(this.status) ??
      i18n.translate('reporting.jobStatusDetail.unknownText', { defaultMessage: 'Unknown' })
    );
  }

  public get canLinkToKibanaApp(): boolean {
    return Boolean(this.locatorParams);
  }

  public get isDownloadReady(): boolean {
    return this.status === JOB_STATUS.COMPLETED || this.status === JOB_STATUS.WARNINGS;
  }

  public get prettyJobTypeName(): undefined | string {
    switch (this.jobtype as JobTypes) {
      case 'printable_pdf':
      case 'printable_pdf_v2':
        return i18n.translate('reporting.jobType.pdfOutputName', {
          defaultMessage: 'PDF',
        });
      case 'PNG':
      case 'PNGV2':
        return i18n.translate('reporting.jobType.pngOutputName', {
          defaultMessage: 'PNG',
        });
      case 'csv_v2':
      case 'csv_searchsource':
        return i18n.translate('reporting.jobType.csvOutputName', {
          defaultMessage: 'CSV',
        });
      default:
        return undefined;
    }
  }

  public get prettyTimeout(): string {
    if (this.timeout == null) {
      return i18n.translate('reporting.jobStatusDetail.timeoutSecondsUnknown', {
        defaultMessage: 'Unknown',
      });
    }
    const seconds = this.timeout / 1000;
    return i18n.translate('reporting.jobStatusDetail.timeoutSeconds', {
      defaultMessage: '{timeout} seconds',
      values: { timeout: seconds },
    });
  }

  /**
   * Returns a user friendly version of the report job creation date
   */
  getCreatedAtDate(): string {
    return this.formatDate(this.created_at);
  }

  /**
   * Returns a user friendly version of the user that created the report job
   */
  getCreatedBy(): string {
    return (
      this.created_by ||
      i18n.translate('reporting.jobCreatedBy.unknownUserPlaceholderText', {
        defaultMessage: 'Unknown',
      })
    );
  }

  getCreatedAtLabel() {
    if (this.created_by) {
      return (
        <>
          <div>{this.formatDate(this.created_at)}</div>
          <span>{this.created_by}</span>
        </>
      );
    }
    return this.formatDate(this.created_at);
  }

  /*
   * We use `output.warnings` to show the error of a failed report job,
   * and to show warnings of a job that completed with warnings.
   */

  // There is no error unless the status is 'failed'
  getError() {
    if (this.status === FAILED) {
      return this.warnings;
    }
  }

  getDeprecatedMessage(): undefined | string {
    if (this.isDeprecated) {
      return i18n.translate('reporting.jobWarning.exportTypeDeprecated', {
        defaultMessage:
          'This is a deprecated export type. Automation of this report will need to be re-created for compatibility with future versions of Kibana.',
      });
    }
  }

  getWarnings() {
    const warnings: string[] = [];
    const deprecatedMessage = this.getDeprecatedMessage();
    if (deprecatedMessage) {
      warnings.push(deprecatedMessage);
    }

    if (this.csv_contains_formulas) {
      warnings.push(
        i18n.translate('reporting.jobWarning.csvContainsFormulas', {
          defaultMessage:
            'Your CSV contains characters that spreadsheet applications might interpret as formulas.',
        })
      );
    }
    if (this.max_size_reached) {
      warnings.push(
        i18n.translate('reporting.jobWarning.maxSizeReachedTooltip', {
          defaultMessage: 'Your search reached the max size and contains partial data.',
        })
      );
    }

    // warnings could contain the failure message
    if (this.status !== FAILED && this.warnings?.length) {
      warnings.push(...this.warnings);
    }

    if (warnings.length) {
      return (
        <ul>
          {warnings.map((w, i) => {
            return <li key={`warning-key-${i}`}>{w}</li>;
          })}
        </ul>
      );
    }
  }

  getPrettyStatusTimestamp() {
    return this.formatDate(this.getStatusTimestamp());
  }

  private formatDate(timestamp: string) {
    try {
      return moment(timestamp).format('YYYY-MM-DD @ hh:mm A');
    } catch (error) {
      // ignore parse error and display unformatted value
      return timestamp;
    }
  }

  private getStatusTimestamp() {
    const status = this.status;
    if (status === PROCESSING && this.started_at) {
      return this.started_at;
    }

    if (this.completed_at && ([COMPLETED, FAILED, WARNINGS] as string[]).includes(status)) {
      return this.completed_at;
    }

    return this.created_at;
  }
}

const jobStatusLabelsMap = new Map<JOB_STATUS, string>([
  [
    PENDING,
    i18n.translate('reporting.jobStatuses.pendingText', {
      defaultMessage: 'Pending',
    }),
  ],
  [
    PROCESSING,
    i18n.translate('reporting.jobStatuses.processingText', {
      defaultMessage: 'Processing',
    }),
  ],
  [
    COMPLETED,
    i18n.translate('reporting.jobStatuses.completedText', {
      defaultMessage: 'Completed', // NOTE: a job is `completed` not `completed_with_warings` if it has reached max size or possibly contains csv characters
    }),
  ],
  [
    WARNINGS,
    i18n.translate('reporting.jobStatuses.warningText', {
      defaultMessage: 'Completed',
    }),
  ],
  [
    FAILED,
    i18n.translate('reporting.jobStatuses.failedText', {
      defaultMessage: 'Failed',
    }),
  ],
]);
