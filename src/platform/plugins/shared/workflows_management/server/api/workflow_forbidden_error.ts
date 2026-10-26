/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export abstract class WorkflowForbiddenError extends Error {
  /**
   * Lets error wrappers outside this plugin (e.g. the Cases route handler, whose
   * `isHTTPError` only checks `statusCode != null`) classify these errors as 403
   * instead of a generic 500. The workflows-management routes map them to
   * `response.forbidden` via the `instanceof` checks in route_error_handlers.
   */
  public readonly statusCode = 403;
  /**
   * Marks the error as caused by the caller, not the platform, so connector
   * execution wraps it as a user-sourced task error.
   */
  public readonly isUserError = true;
}
