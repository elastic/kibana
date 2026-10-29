/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ZodError, prettifyError } from '@kbn/zod';
import { TransformPanelsInError } from './api/transforms/in/transform_panels_in_error';

const formatPanelErrors = ({ panelErrors }: TransformPanelsInError): string =>
  panelErrors.map(({ type, message }) => `${type}: ${message}`).join('\n');

/**
 * Thrown by the dashboard server client when the dashboard is invalid; nothing was saved. The
 * message matches what the dashboard REST endpoints return, and `cause` is the original error.
 */
export class DashboardValidationError extends Error {
  public readonly cause: ZodError | TransformPanelsInError;

  constructor(cause: ZodError | TransformPanelsInError) {
    super(
      `The dashboard is invalid:\n${
        cause instanceof ZodError ? prettifyError(cause) : formatPanelErrors(cause)
      }`
    );
    this.name = 'DashboardValidationError';
    this.cause = cause;
  }
}
