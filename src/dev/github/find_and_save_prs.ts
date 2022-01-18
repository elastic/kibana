/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { Octokit } from '@octokit/rest';
import fs from 'fs';

interface Labels {
  include: string[];
  exclude: string[];
}

interface PR {
  title: string;
  url: string;
  releaseLabel: string;
}

export async function savePrsToCsv(
  log: ToolingLog,
  githubToken: string,
  labelsPath: string,
  filename: string,
  mergedSince: string
) {
  const octokit = new Octokit({
    auth: githubToken,
  });

  let q = 'repo:"elastic/kibana"+is:pull-request+is:merged+sort:updated-desc';

  if (mergedSince.length > 0) {
    q += `+merged:>=${mergedSince}`;
  }

  const rawData = fs.readFileSync(labelsPath, 'utf8');
  const labels = JSON.parse(rawData) as Labels;

  labels.include.map((label) => (q += `+label:${label}`));
  labels.exclude.map((label) => (q += ` -label:"${label}"`));

  const items: PR[] = [];
  const perPage = 100;
  let page = 1;
  let hasMorePages = true;
  let prCount = 0;

  while (hasMorePages) {
    const response = await octokit.search.issuesAndPullRequests({ q, per_page: perPage, page });
    if (page === 1) {
      log.info(`Found ${(prCount = response.data.total_count)} PRs`);
      // Only the first 1000 search results are available via pagination
      if (prCount > 1000) {
        throw new Error(`Too many PRs, adjust query to have less than 1000`);
      }
    }

    if (page < Math.ceil(prCount / perPage)) {
      page += 1;
    } else {
      hasMorePages = false;
    }

    items.push(
      ...response.data.items.map((i) => {
        return {
          title: i.title,
          url: i.html_url,
          releaseLabel: i.labels
            .filter((l) => l.name.startsWith('release_note'))
            .map((l) => l.name)
            .join(','),
        } as PR;
      })
    );
  }

  let csv = '';
  for (const i of items) {
    csv += `${i.title}\t${i.url}\t${i.releaseLabel}\r\n`;
  }
  fs.writeFileSync(filename, csv);
  log.info(`Saved to ${filename}`);
}
