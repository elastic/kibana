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

import { Version } from './version';
import { PullRequest } from './pull_request';
import { IGNORE_LABELS } from '../release_notes_config';
import { IrrelevantPrSummary } from './irrelevant_pr_summary';

export function isPrRelevant(
  pr: PullRequest,
  version: Version,
  includeVersions: Version[],
  summary: IrrelevantPrSummary
) {
  for (const label of IGNORE_LABELS) {
    if (typeof label === 'string') {
      if (pr.labels.includes(label)) {
        summary.skippedByLabel(pr, label);
        return false;
      }
    }

    if (label instanceof RegExp) {
      const matching = pr.labels.find((l) => label.test(l));
      if (matching) {
        summary.skippedByLabelRegExp(pr, label, matching);
        return false;
      }
    }
  }

  const [earliestVersion] = Version.sort(
    // filter out `includeVersions` so that they won't be considered the "earliest version", only
    // versions which are actually before the current `version` or the `version` itself are eligible
    pr.versions.filter((v) => !includeVersions.includes(v)),
    'asc'
  );

  if (version !== earliestVersion) {
    summary.skippedByVersion(pr, earliestVersion);
    return false;
  }

  return true;
}
