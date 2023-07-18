/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BaseParams, BasePayload } from '@kbn/reporting-common';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';

interface BaseParamsPNG {
  layout: LayoutParams;
  forceNow?: string;
  relativeUrl: string;
}

// Job params: structure of incoming user request data
/**
 * @deprecated
 */
export type JobParamsPNGDeprecated = BaseParamsPNG & BaseParams;

// Job payload: structure of stored job data provided by create_job
export type TaskPayloadPNG = BaseParamsPNG & BasePayload;
