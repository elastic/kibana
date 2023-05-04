/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
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
  query: string | undefined,
  mergedSince: string | undefined
) {
  const repo = `repo:"elastic/kibana"`;
  const defaultQuery = 'is:pull-request+is:merged+sort:updated-desc';
  const perPage = 100;
  const searchApiLimit = 1000;

  let q = repo + '+' + (query ?? defaultQuery) + (mergedSince ? `+merged:>=${mergedSince}` : '');

  const rawData = fs.readFileSync(labelsPath, 'utf8');
  const labels = JSON.parse(rawData) as Labels;

  labels.include.map((label) => (q += `+label:${label}`));
  labels.exclude.map((label) => (q += ` -label:"${label}"`));

  log.debug(`Github query: ${q}`);

  const octokit = new Octokit({
    auth: githubToken,
  });
  const items: PR[] = await octokit.paginate(
    'GET /search/issues',
    { q, per_page: perPage },
    (response) =>
      response.data.map((item: Octokit.SearchIssuesAndPullRequestsResponseItemsItem) => {
        return {
          title: item.title,
          url: item.html_url,
          releaseLabel: item.labels
            .filter((label) => label.name.trim().startsWith('release_note'))
            .map((label) => label.name)
            .join(','),
        } as PR;
      })
  );

  // https://docs.github.com/en/rest/reference/search
  if (items.length >= searchApiLimit) {
    log.warning(
      `Search API limit is 1000 results per search, try to adjust the query. Saving first 1000 PRs`
    );
  } else {
    log.info(`Found ${items.length} PRs`);
  }

  let csv = '';
  for (const i of items) {
    csv += `${i.title}\t${i.url}\t${i.releaseLabel}\r\n`;
  }

  fs.writeFileSync(filename, csv);
  log.info(`Saved to ${filename}`);
}
