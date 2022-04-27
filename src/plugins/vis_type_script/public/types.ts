/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, Query } from '@kbn/es-query';
import { TimeRange } from '@kbn/data-plugin/common';

export interface Arguments {
  script: string;
  dependencyUrls: string[];
}

export interface VisParams {
  script: Arguments['script'];
  dependencyUrls: Arguments['dependencyUrls'];
}

export interface VisSearchContext {
  filters?: Filter[];
  query?: Query | Query[];
  timeRange?: TimeRange;
}
