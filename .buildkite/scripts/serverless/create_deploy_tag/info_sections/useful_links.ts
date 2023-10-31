/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function getCommitDiffLink(from: string, to: string) {
  return `<a href="https://github.com/elastic/kibana/compare/${from}...${to}">Commits contained in deploy</a>`;
}

export function getUsefulLinksHtml(
  heading: string,
  data: { previousCommitHash: string; selectedCommitHash: string }
) {
  return `<h4>${heading}</h4>
    <ul>
        <li>${getCommitDiffLink(data.previousCommitHash, data.selectedCommitHash)}</li>
</ul>`;
}
