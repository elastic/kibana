/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';

/**
 * Must match `KBN_REPORT_COLOR_MODE_HEADER` in `@kbn/reporting-common`.
 * Core rendering cannot depend on the reporting package.
 */
export const KBN_REPORT_COLOR_MODE_HEADER = 'x-kbn-report-color-mode';

/**
 * When screenshotting a PDF/PNG report, Chromium sends this header so first-paint
 * stylesheets match the theme stored on the job.
 */
export const getReportColorModeOverride = (request: KibanaRequest): DarkModeValue | undefined => {
  const raw = request.headers[KBN_REPORT_COLOR_MODE_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'light') {
    return false;
  }
  if (value === 'dark') {
    return true;
  }
  return undefined;
};
