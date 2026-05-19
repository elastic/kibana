/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const commands: {
  snapshot: import('./types').Command;
  source: import('./types').Command;
  archive: {
    description: string;
    usage: string;
    help: (defaults?: Record<string, any>) => string;
    run: (defaults?: {}) => Promise<void>;
  };
  build_snapshots: import('./types').Command;
  docker: import('./types').Command;
  serverless: import('./types').Command;
};
