/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** How the reporting task responds to a page-render-service failure. */
export enum RenderServiceRetryClass {
  /** No render slot within this run's wait budget; hand the worker back. */
  CAPACITY = 'capacity',
  /** The service, or something in front of it, could not be reached. */
  UNAVAILABLE = 'unavailable',
  /** The service tried and failed to render the page. */
  RENDER_FAILURE = 'render_failure',
  /** Retrying cannot help. */
  UNRECOVERABLE = 'unrecoverable',
}

/**
 * Why a page-render-service request did not produce a report. Reported as `reporting.retry.reason`,
 * so it names the cause where the retry class names the response.
 */
export enum RenderRetryReason {
  SATURATED = 'saturated',
  UNAVAILABLE = 'unavailable',
  RENDER_FAILURE = 'render_failure',
  REJECTED = 'rejected',
}

/** What the reporting task did about a failed render. Reported as `reporting.retry.action`. */
export enum RenderRetryAction {
  /** Run again at once. */
  HAND_BACK = 'hand_back',
  /** Run again after a pause. */
  RESCHEDULE = 'reschedule',
  /** End the report. */
  FAIL = 'fail',
}
