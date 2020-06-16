/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ToolingLog } from '@kbn/dev-utils';

import { PullRequest } from './pull_request';
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
