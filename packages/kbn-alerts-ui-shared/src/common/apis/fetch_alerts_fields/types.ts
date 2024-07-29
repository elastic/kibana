/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { ValidFeatureId } from '@kbn/rule-data-utils';

export interface FetchAlertsFieldsParams {
  // Dependencies
  http: HttpSetup;

  // Params
  /**
   * Array of feature ids used for authorization and area-based filtering
   */
  featureIds: ValidFeatureId[];
}
