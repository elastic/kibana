/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@kbn/screenshotting-plugin/common';
import {
  BrowserCouldNotLaunchError,
  BrowserScreenshotError,
  BrowserUnexpectedlyClosedError,
  DisallowedOutgoingUrl,
  InvalidLayoutParametersError,
  PdfWorkerOutOfMemoryError,
  ReportingError,
  UnknownError,
  VisualReportingSoftDisabledError,
} from '.';

/**
 * Map an error object from the Screenshotting plugin into an error type of the Reporting domain.
 *
 * NOTE: each type of ReportingError code must be referenced in each applicable `errorCodesSchema*` object in
 * x-pack/plugins/reporting/server/usage/schema.ts
 *
 * @param {unknown} error - a kind of error object
 * @returns {ReportingError} - the converted error object
 */
export function mapToReportingError(error: unknown): ReportingError {
  if (error instanceof ReportingError) {
    return error;
  }
  switch (true) {
    case error instanceof errors.InvalidLayoutParametersError:
      return new InvalidLayoutParametersError((error as Error).message);
    case error instanceof errors.DisallowedOutgoingUrl:
      return new DisallowedOutgoingUrl((error as Error).message);
    case error instanceof errors.BrowserClosedUnexpectedly:
      return new BrowserUnexpectedlyClosedError((error as Error).message);
    case error instanceof errors.FailedToCaptureScreenshot:
      return new BrowserScreenshotError((error as Error).message);
    case error instanceof errors.FailedToSpawnBrowserError:
      return new BrowserCouldNotLaunchError();
    case error instanceof errors.PdfWorkerOutOfMemoryError:
      return new PdfWorkerOutOfMemoryError();
    case error instanceof errors.InsufficientMemoryAvailableOnCloudError:
      return new VisualReportingSoftDisabledError();
  }
  return new UnknownError();
}
