/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { APMBaseDoc } from './apm_base_doc';
import { TimestampUs } from './fields/timestamp_us';

export interface EventRaw extends APMBaseDoc {
  timestamp: TimestampUs;
  transaction?: {
    id: string;
    sampled?: boolean;
    type: string;
  };
  log: {
    message?: string;
  };
  event: {
    action: string;
    category: string;
  };
}
