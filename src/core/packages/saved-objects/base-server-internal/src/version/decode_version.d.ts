/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Decode the "opaque" version string to the sequence params we
 * can use to activate optimistic concurrency in Elasticsearch
 */
export declare function decodeVersion(version?: string): {
  _seq_no: number;
  _primary_term: number;
};
