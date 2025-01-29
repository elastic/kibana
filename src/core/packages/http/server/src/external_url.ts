/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IExternalUrlPolicy } from '@kbn/core-http-common';

/**
 * External Url configuration for use in Kibana.
 * @public
 */
export interface IExternalUrlConfig {
  /**
   * A set of policies describing which external urls are allowed.
   */
  readonly policy: IExternalUrlPolicy[];
}
