/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RULE_IDS, isSavedObjectsCheckError, type SavedObjectsCheckFinding } from './types';

export class FindingsCollector {
  private readonly findings: SavedObjectsCheckFinding[] = [];

  add(finding: SavedObjectsCheckFinding): void {
    this.findings.push(finding);
  }

  /**
   * Convert errors collected by Listr (`globalTask.errors`) into findings.
   * `SavedObjectsCheckError` instances surface their structured payload; everything
   * else falls back to a generic-rule finding so coverage stays at 100% while
   * validators are migrated incrementally.
   */
  ingestErrors(errors: ReadonlyArray<unknown>): void {
    for (const err of errors) {
      if (isSavedObjectsCheckError(err)) {
        this.findings.push(err.finding);
        continue;
      }

      const message = err instanceof Error ? err.message : String(err);
      this.findings.push({
        ruleId: RULE_IDS.GENERIC,
        severity: 'error',
        message: stripLeadingEmoji(message),
      });
    }
  }

  getFindings(): SavedObjectsCheckFinding[] {
    return this.findings.slice();
  }
}

function stripLeadingEmoji(message: string): string {
  return message.replace(/^[\u274c\u26a0\ufe0f\s]+/, '').trim();
}
