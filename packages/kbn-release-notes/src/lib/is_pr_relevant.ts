/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Version } from './version';
import { PullRequest } from './pr_api';
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
