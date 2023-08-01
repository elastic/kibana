/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LocatorParams, BaseParams, BasePayload } from '@kbn/reporting-common';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';

interface BaseParamsPDFV2 {
  layout: LayoutParams;

  /**
   * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
   */
  locatorParams: LocatorParams[];
}

// Job params: structure of incoming user request data, after being parsed from RISON
export type JobParamsPDFV2 = BaseParamsPDFV2 & BaseParams;

export type JobAppParamsPDFV2 = Omit<JobParamsPDFV2, 'browserTimezone' | 'version'>;

// Job payload: structure of stored job data provided by create_job
export interface TaskPayloadPDFV2 extends BasePayload, BaseParamsPDFV2 {
  layout: LayoutParams;
  /**
   * The value of forceNow is injected server-side every time a given report is generated.
   */
  forceNow: string;
}
