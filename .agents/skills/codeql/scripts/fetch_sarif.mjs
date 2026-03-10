/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fetches CodeQL SARIF results and alerts from GitHub for a given PR or branch.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node .cursor/skills/codeql-local-testing/scripts/fetch_sarif.mjs <pr_number|ref>
 *
 * Examples:
 *   GITHUB_TOKEN=ghp_xxx node .cursor/skills/codeql-local-testing/scripts/fetch_sarif.mjs 252121
 *   GITHUB_TOKEN=ghp_xxx node .cursor/skills/codeql-local-testing/scripts/fetch_sarif.mjs refs/heads/main
 *
 * Environment:
 *   GITHUB_TOKEN - required, GitHub personal access token with `security_events` scope
 */

import { Octokit } from '@octokit/rest';

const GITHUB_OWNER = 'elastic';
const GITHUB_REPO = 'kibana';

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is required.');
  console.error('Create a token with `security_events` scope at https://github.com/settings/tokens');
  process.exit(1);
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: GITHUB_TOKEN=ghp_xxx node fetch_sarif.mjs <pr_number|ref>');
  console.error('  e.g. node fetch_sarif.mjs 252121');
  console.error('  e.g. node fetch_sarif.mjs refs/heads/main');
  process.exit(1);
}

const ref = /^\d+$/.test(input) ? `refs/pull/${input}/merge` : input;

const octokit = new Octokit({ auth: token });

const main = async () => {
  // Step 1: List recent CodeQL analyses for the ref
  console.log(`\n=== Fetching CodeQL analyses for ${ref} ===\n`);
  const { data: analyses } = await octokit.codeScanning.listRecentAnalyses({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    tool_name: 'CodeQL',
    ref,
    per_page: 10,
  });

  if (analyses.length === 0) {
    console.log('No CodeQL analyses found for this ref.');
    return;
  }

  console.log(`Found ${analyses.length} analysis run(s):`);
  for (const a of analyses) {
    console.log(`  - id: ${a.id} | created: ${a.created_at} | sarif_id: ${a.sarif_id}`);
  }

  // Step 2: Fetch SARIF data from the most recent analysis
  const [recentAnalysis] = analyses;
  console.log(`\n=== Fetching SARIF for analysis ${recentAnalysis.id} ===\n`);

  const { data: sarifMeta } = await octokit.codeScanning.getSarif({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    sarif_id: recentAnalysis.sarif_id,
  });

  const { data: analysisDetails } = await octokit.request({ url: sarifMeta.analyses_url });
  const { data: rawSarif } = await octokit.request({
    url: analysisDetails[0].url,
    headers: { Accept: 'application/sarif+json' },
  });

  const sarifData = typeof rawSarif === 'string'
    ? JSON.parse(rawSarif)
    : JSON.parse(new TextDecoder('utf-8').decode(rawSarif));

  if (!sarifData.runs?.length) {
    console.log('No runs found in SARIF data.');
    return;
  }

  // Step 3: Print SARIF results
  for (const run of sarifData.runs) {
    const results = run.results ?? [];
    const rulesById = Object.fromEntries(
      (run.tool?.driver?.rules ?? []).map((r) => [r.id, r])
    );

    console.log(`Results: ${results.length}`);
    if (results.length === 0) continue;

    for (const result of results) {
      const rule = rulesById[result.ruleId] ?? {};
      const location = result.locations?.[0]?.physicalLocation;
      const severity = rule.properties?.['security-severity'] ?? 'N/A';

      console.log(`\n  Rule:     ${result.ruleId}`);
      console.log(`  Severity: ${severity}`);
      console.log(`  Message:  ${result.message?.text}`);
      if (location) {
        console.log(`  File:     ${location.artifactLocation?.uri}:${location.region?.startLine}`);
      }
    }
  }

  // Step 4: Fetch code scanning alerts for the ref
  console.log(`\n=== Code Scanning Alerts ===\n`);
  const { data: alerts } = await octokit.codeScanning.listAlertsForRepo({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    ref,
    tool_name: 'CodeQL',
    per_page: 100,
  });

  console.log(`Total alerts: ${alerts.length}`);
  for (const alert of alerts) {
    console.log({
      number: alert.number,
      rule: alert.rule?.id,
      severity: alert.rule?.security_severity_level,
      state: alert.state,
      description: alert.rule?.description,
      path: alert.most_recent_instance?.location?.path,
      line: alert.most_recent_instance?.location?.start_line,
    });
  }
};

main().catch((err) => {
  console.error('Failed to fetch SARIF data:', err.message);
  process.exit(1);
});
