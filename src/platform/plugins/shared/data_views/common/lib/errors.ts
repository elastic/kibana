/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnError } from '@kbn/kibana-utils-plugin/common';

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export class DataViewMissingIndices extends KbnError {
  constructor(message: string) {
    const defaultMessage = "Data view's title does not match any indices";

    super(message && message.length ? `No matching indices found: ${message}` : defaultMessage);
  }
}
