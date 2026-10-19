/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const DEFAULT_WAIT_FOR_APPROVAL_APPROVE_LABEL: 'Approve';
export declare const DEFAULT_WAIT_FOR_APPROVAL_REJECT_LABEL: 'Decline';
export declare const DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT: '24h';
export declare const WAIT_FOR_APPROVAL_RESPONSE_SCHEMA: {
  readonly type: 'object';
  readonly properties: {
    readonly approved: {
      readonly type: 'boolean';
      readonly description: 'Whether the request was approved';
    };
  };
  readonly required: ['approved'];
};
