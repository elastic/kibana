/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */
import { i18n } from '@kbn/i18n';

export interface ReportingError {
  /**
   * Return a message describing the error that is human friendly
   */
  humanFriendlyMessage?(): string;
}
export abstract class ReportingError extends Error {
  /**
   * A string that uniquely brands an error type. This is used to power telemetry
   * about reporting failures.
   *
   * @note Convention for codes: lower-case, snake-case and end in `_error`.
   */
  public abstract get code(): string;

  constructor(public details?: string) {
    super();
  }

  public get message(): string {
    const prefix = `ReportingError`;
    return this.details
      ? `${prefix}(code: ${this.code}) "${this.details}"`
      : `${prefix}(code: ${this.code})`;
  }

  public toString() {
    return this.message;
  }
}

/**
 * While validating the page layout parameters for a screenshot type report job
 */
export class InvalidLayoutParametersError extends ReportingError {
  static code = 'invalid_layout_parameters_error' as const;
  public get code() {
    return InvalidLayoutParametersError.code;
  }
}

/**
 * While loading requests in the Kibana app, a URL was encountered that the network policy did not allow.
 */
export class DisallowedOutgoingUrl extends ReportingError {
  static code = 'disallowed_outgoing_url_error' as const;
  public get code() {
    return DisallowedOutgoingUrl.code;
  }
}

/**
 * While performing some reporting action, like fetching data from ES, our
 * access token expired.
 */
export class AuthenticationExpiredError extends ReportingError {
  static code = 'authentication_expired_error' as const;
  public get code(): string {
    return AuthenticationExpiredError.code;
  }
}

export class MissingAuthenticationError extends ReportingError {
  static code = 'missing_authentication_header_error' as const;
  public get code(): string {
    return MissingAuthenticationError.code;
  }
}

export class QueueTimeoutError extends ReportingError {
  static code = 'queue_timeout_error' as const;
  public get code(): string {
    return QueueTimeoutError.code;
  }
}

/**
 * An unknown error has occurred. See details.
 */
export class UnknownError extends ReportingError {
  static code = 'unknown_error' as const;
  public get code(): string {
    return UnknownError.code;
  }
}

export class PdfWorkerOutOfMemoryError extends ReportingError {
  static code = 'pdf_worker_out_of_memory_error' as const;
  public get code(): string {
    return PdfWorkerOutOfMemoryError.code;
  }

  public humanFriendlyMessage() {
    return i18n.translate('reporting.common.pdfWorkerOutOfMemoryErrorMessage', {
      defaultMessage: `Can't generate a PDF due to insufficient memory. Try making a smaller PDF and retrying this report.`,
    });
  }
}

export class BrowserCouldNotLaunchError extends ReportingError {
  static code = 'browser_could_not_launch_error' as const;
  public get code(): string {
    return BrowserCouldNotLaunchError.code;
  }

  public humanFriendlyMessage() {
    return i18n.translate('reporting.common.browserCouldNotLaunchErrorMessage', {
      defaultMessage: `Can't generate screenshots because the browser did not launch. See the server logs for more information.`,
    });
  }
}

export class BrowserUnexpectedlyClosedError extends ReportingError {
  static code = 'browser_unexpectedly_closed_error' as const;
  public get code(): string {
    return BrowserUnexpectedlyClosedError.code;
  }
}

export class BrowserScreenshotError extends ReportingError {
  static code = 'browser_screenshot_error' as const;
  public get code(): string {
    return BrowserScreenshotError.code;
  }
}

export class KibanaShuttingDownError extends ReportingError {
  static code = 'kibana_shutting_down_error' as const;
  public get code(): string {
    return KibanaShuttingDownError.code;
  }
}

/**
 * Special error case that should only occur on Cloud when trying to generate
 * a report on a Kibana instance that is too small to be running Chromium.
 */
export class VisualReportingSoftDisabledError extends ReportingError {
  static code = 'visual_reporting_soft_disabled_error' as const;
  public get code(): string {
    return VisualReportingSoftDisabledError.code;
  }

  humanFriendlyMessage() {
    return i18n.translate('reporting.common.cloud.insufficientSystemMemoryError', {
      defaultMessage: `Can't generate this report due to insufficient memory.`,
    });
  }
}

export class ReportingSavedObjectNotFoundError extends ReportingError {
  static code = 'reporting_saved_object_not_found_error' as const;
  public get code(): string {
    return ReportingSavedObjectNotFoundError.code;
  }
}

/**
 * How the reporting task responds to a page-render-service failure (serverless). The service has
 * no queue, so retrying is the caller's job: see `render_retry.ts` in the reporting plugin.
 *
 * - `capacity`: no render slot came free within this run's wait budget; hand the worker back.
 * - `unavailable`: the service could not be reached, or something in front of it failed.
 * - `render_failure`: the service tried and failed to render the page.
 * - `unrecoverable`: retrying cannot help.
 */
export type RenderServiceRetryClass =
  | 'capacity'
  | 'unavailable'
  | 'render_failure'
  | 'unrecoverable';

export abstract class RenderServiceError extends ReportingError {
  public abstract get retryClass(): RenderServiceRetryClass;
}

export class RenderServiceSaturatedError extends RenderServiceError {
  static code = 'render_service_saturated_error' as const;
  public get code(): string {
    return RenderServiceSaturatedError.code;
  }
  public get retryClass() {
    return 'capacity' as const;
  }
}

export class RenderServiceUnavailableError extends RenderServiceError {
  static code = 'render_service_unavailable_error' as const;
  public get code(): string {
    return RenderServiceUnavailableError.code;
  }
  public get retryClass() {
    return 'unavailable' as const;
  }

  public humanFriendlyMessage() {
    return i18n.translate('reporting.common.renderServiceUnavailableErrorMessage', {
      defaultMessage: `Can't generate this report because the rendering service is unavailable. Try again later.`,
    });
  }
}

export class RenderFailedError extends RenderServiceError {
  static code = 'render_failed_error' as const;
  public get code(): string {
    return RenderFailedError.code;
  }
  public get retryClass() {
    return 'render_failure' as const;
  }
}

export class RenderRequestRejectedError extends RenderServiceError {
  static code = 'render_request_rejected_error' as const;
  public get code(): string {
    return RenderRequestRejectedError.code;
  }
  public get retryClass() {
    return 'unrecoverable' as const;
  }
}

/** The rendering service stayed at capacity until the report's time ran out. */
export class RenderCapacityTimeoutError extends RenderServiceError {
  static code = 'render_capacity_timeout_error' as const;
  public get code(): string {
    return RenderCapacityTimeoutError.code;
  }
  public get retryClass() {
    return 'unrecoverable' as const;
  }

  public humanFriendlyMessage() {
    return i18n.translate('reporting.common.renderCapacityTimeoutErrorMessage', {
      defaultMessage: `Can't generate this report because the rendering service was busy for too long. Try again later.`,
    });
  }
}
