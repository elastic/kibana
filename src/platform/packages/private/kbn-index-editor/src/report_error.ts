/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';

type LabelValue = string | number | boolean | null | undefined;

export interface ReportIndexEditorErrorOptions {
  errorType: string;
  labels?: Record<string, LabelValue>;
}

export const reportIndexEditorError = (
  error: unknown,
  { errorType, labels }: ReportIndexEditorErrorOptions
): void => {
  const captured = error instanceof Error ? error : new Error(String(error));
  apm.captureError(captured, {
    labels: { app: 'index_editor', error_type: errorType, ...labels },
  });
};
