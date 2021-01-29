/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-disable */

import { KbnError } from '../../../../kibana_utils/common/';

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export class IndexPatternMissingIndices extends KbnError {
  constructor(message: string) {
    const defaultMessage = "IndexPattern's configured pattern does not match any indices";

    super(
      message && message.length ? `No matching indices found: ${message}` : defaultMessage
    );
  }
}
