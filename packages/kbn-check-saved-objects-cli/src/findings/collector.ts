/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ListrError } from 'listr2';
import { RULE_IDS, type SavedObjectsCheckFinding } from './types';
import { isSavedObjectsCheckError } from './error';

export class FindingsCollector {
  private readonly findings: SavedObjectsCheckFinding[] = [];

  add(finding: SavedObjectsCheckFinding): void {
    this.findings.push(finding);
  }

  /**
   * Convert errors collected by Listr (`globalTask.errors`) into findings.
   * `SavedObjectsCheckError` instances surface their structured payload(s);
   * everything else falls back to a generic-rule finding so coverage stays
   * at 100% while validators are migrated incrementally.
   *
   * Note: Listr2 wraps every task error in a `ListrError` whose `.error`
   * property holds the original thrown value. We unwrap one level before
   * the `SavedObjectsCheckError` check so that structured findings are not
   * silently downgraded to the generic fallback.
   */
  ingestErrors(errors: ReadonlyArray<unknown>): void {
    for (const err of errors) {
      const unwrappedError = err instanceof ListrError ? err.error : err;

      if (isSavedObjectsCheckError(unwrappedError)) {
        this.findings.push(...unwrappedError.findings);
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

  /**
   * Returns deduplicated findings. When the same rule fires for the same type
   * in both the regular and serverless baseline checks, the two findings are
   * merged into one: the first occurrence is kept and fields from subsequent
   * duplicates are folded in when the existing value is absent.
   *
   * Merge strategy per field:
   * - `baselineUrl` / `serverlessBaselineUrl`: accumulate both links.
   * - `fixHint` / `docsAnchor`: first non-null value wins. Both occurrences should
   *   carry identical hints (same rule, same type), but if one is absent the other
   *   is used rather than silently discarding it.
   *
   * Deduplication key: ruleId + typeName + message.
   */
  getFindings(): SavedObjectsCheckFinding[] {
    const seen = new Map<string, SavedObjectsCheckFinding>();
    for (const f of this.findings) {
      const key = `${f.ruleId}:${f.typeName ?? ''}:${f.message}`;
      const existing = seen.get(key);
      if (existing) {
        existing.baselineUrl ??= f.baselineUrl;
        existing.serverlessBaselineUrl ??= f.serverlessBaselineUrl;
        existing.fixHint ??= f.fixHint;
        existing.docsAnchor ??= f.docsAnchor;
        existing.details ??= f.details;
      } else {
        seen.set(key, { ...f });
      }
    }
    return [...seen.values()];
  }
}

function stripLeadingEmoji(message: string): string {
  return message.replace(/^[\u274c\u26a0\ufe0f\s]+/, '').trim();
}
