/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface TestFailure {
  id: string;
  suite: string;
  title: string;
  target: string;
  command: string;
  location: string;
  owner: string[];
  plugin?: {
    id: string;
    visibility: string;
    group: string;
  };
  duration: number;
  error: {
    message?: string;
    stack_trace?: string;
  };
  stdout?: string;
  attachments: Array<{
    name: string;
    path?: string;
    contentType: string;
  }>;
}
