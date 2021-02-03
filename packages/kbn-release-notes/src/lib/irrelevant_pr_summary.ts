/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';

import { PullRequest } from './pr_api';
import { Version } from './version';

export class IrrelevantPrSummary {
  private readonly stats = {
    'skipped by label': new Map<string, number>(),
    'skipped by label regexp': new Map<string, number>(),
    'skipped by version': new Map<string, number>(),
  };

  constructor(private readonly log: ToolingLog) {}

  skippedByLabel(pr: PullRequest, label: string) {
    this.log.debug(`${pr.terminalLink} skipped, label [${label}] is ignored`);
    this.increment('skipped by label', label);
  }

  skippedByLabelRegExp(pr: PullRequest, regexp: RegExp, label: string) {
    this.log.debug(`${pr.terminalLink} skipped, label [${label}] matches regexp [${regexp}]`);
    this.increment('skipped by label regexp', `${regexp}`);
  }

  skippedByVersion(pr: PullRequest, earliestVersion: Version) {
    this.log.debug(`${pr.terminalLink} skipped, earliest version is [${earliestVersion.label}]`);
    this.increment('skipped by version', earliestVersion.label);
  }

  private increment(stat: keyof IrrelevantPrSummary['stats'], key: string) {
    const n = this.stats[stat].get(key) || 0;
    this.stats[stat].set(key, n + 1);
  }

  logStats() {
    for (const [description, stats] of Object.entries(this.stats)) {
      for (const [key, count] of stats) {
        this.log.warning(`${count} ${count === 1 ? 'pr was' : 'prs were'} ${description} [${key}]`);
      }
    }
  }
}
