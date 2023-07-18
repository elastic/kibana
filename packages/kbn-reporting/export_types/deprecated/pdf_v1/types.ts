/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
import type { BaseParams, BasePayload } from '@kbn/reporting-common';

interface BaseParamsPDF {
  layout: LayoutParams;
  relativeUrls: string[];
  isDeprecated?: boolean;
}

// Job params: structure of incoming user request data, after being parsed from RISON

/**
 * @deprecated
 */
export type JobParamsPDFDeprecated = BaseParamsPDF & BaseParams;

/**
 * @deprecated
 */
export type JobAppParamsPDF = Omit<JobParamsPDFDeprecated, 'browserTimezone' | 'version'>;

/**
 * Structure of stored job data provided by create_job
 */
export interface TaskPayloadPDF extends BasePayload {
  layout: LayoutParams;
  forceNow?: string;
  objects: Array<{ relativeUrl: string }>;
}
