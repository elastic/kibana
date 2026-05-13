/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Static helpers for the split UI / background-tasks Kibana processes used in tests.
 * The FTR service class {@link DedicatedTaskRunner} in `@kbn/test` wraps these helpers
 * with runtime state (port, URL, KbnClient, etc.).
 */
export class DedicatedTaskRunnerConfig {
  private constructor() {}

  static getPort(uiPort: number): number {
    return uiPort + 13;
  }

  static getUuid(mainUuid: string): string {
    if (mainUuid.length !== 36) {
      throw new Error(`invalid mainUuid: ${mainUuid}`);
    }

    return `00000000-${mainUuid.slice(9)}`;
  }
}
