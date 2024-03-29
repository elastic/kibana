/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KbnError } from '@kbn/kibana-utils-plugin/common';

export class NoSearchIdInSessionError extends KbnError {
  constructor() {
    super('No search ID in this session matching the given search request');
  }
}
