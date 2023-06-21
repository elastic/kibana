/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface AuditdEcs {
  result?: string[];

  session?: string[];

  data?: AuditdDataEcs;

  summary?: SummaryEcs;

  sequence?: string[];
}

export interface AuditdDataEcs {
  acct?: string[];

  terminal?: string[];

  op?: string[];
}

export interface SummaryEcs {
  actor?: PrimarySecondaryEcs;

  object?: PrimarySecondaryEcs;

  how?: string[];

  message_type?: string[];

  sequence?: string[];
}

export interface PrimarySecondaryEcs {
  primary?: string[];

  secondary?: string[];

  type?: string[];
}
