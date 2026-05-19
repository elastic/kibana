/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');

const readReport = (reportPath) => JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const asArray = (value) => (Array.isArray(value) ? value : []);
const toElasticTeamReviewer = (slug) => (slug.startsWith('elastic/') ? slug : `elastic/${slug}`);

const safeInt = (n) => {
  const i = Number.parseInt(String(n), 10);
  return Number.isFinite(i) && i >= 0 ? i : 0;
};

const getManagedRuleDrift = (report) => asArray(report.managedRuleDrift);

const printReportMetrics = (reportPath) => {
  const report = readReport(reportPath);
  const managedRuleDrift = getManagedRuleDrift(report);
  const rulesWithNoComputedReviewersDetails = asArray(report.rulesWithNoComputedReviewersDetails);
  const managedSyncNeeded = Number.isFinite(report.managedSyncNeeded)
    ? report.managedSyncNeeded
    : managedRuleDrift.length;
  const packagesUsedButNotCovered = asArray(report.packagesUsedButNotCovered);
  const rulesWithNoComputedReviewers = Number.isFinite(report.rulesWithNoComputedReviewers)
    ? report.rulesWithNoComputedReviewers
    : rulesWithNoComputedReviewersDetails.length;

  process.stdout.write(
    `managedSyncNeeded=${safeInt(managedSyncNeeded)}\n` +
      `managedRuleDrift=${safeInt(managedRuleDrift.length)}\n` +
      `untracked=${safeInt(packagesUsedButNotCovered.length)}\n` +
      `noComputedReviewers=${safeInt(rulesWithNoComputedReviewers)}\n`
  );
};

const parseLimit = (rawLimit) => {
  const limit = Number.parseInt(rawLimit, 10);
  return Number.isFinite(limit) && limit > 0 ? limit : 25;
};

const printUntrackedPackages = (reportPath, rawLimit) => {
  const report = readReport(reportPath);
  const packagesUsedButNotCovered = asArray(report.packagesUsedButNotCovered);

  process.stdout.write(packagesUsedButNotCovered.slice(0, parseLimit(rawLimit)).join('\n'));
};

const printNoComputedReviewerRules = (reportPath, rawLimit) => {
  const report = readReport(reportPath);
  const details = asArray(report.rulesWithNoComputedReviewersDetails);

  const formatRule = (detail) => {
    const idx = typeof detail.index === 'number' ? detail.index : '?';
    const groupName =
      typeof detail.groupName === 'string' && detail.groupName.length > 0 ? detail.groupName : null;
    const header = groupName ? `"${groupName}"` : `rule[${idx}]`;
    const mode = typeof detail.mode === 'string' ? detail.mode : 'unknown';
    const packages = asArray(detail.packages);
    const before = asArray(detail.before);
    const packagesStr =
      packages.length <= 6
        ? packages.join(', ')
        : `${packages.slice(0, 6).join(', ')}, …(+${packages.length - 6})`;
    const beforeStr = before.length === 0 ? '(no reviewers set)' : before.join(', ');

    return `${header} (${mode}) packages: ${packagesStr} | existing reviewers: ${beforeStr}`;
  };

  process.stdout.write(details.slice(0, parseLimit(rawLimit)).map(formatRule).join('\n'));
};

const getComputedTeamReviewers = (report) => {
  const reviewers = new Set();
  for (const drift of getManagedRuleDrift(report)) {
    const after = asArray(drift.after);
    for (const reviewer of after) {
      if (typeof reviewer === 'string' && reviewer.startsWith('team:')) {
        reviewers.add(`elastic/${reviewer.slice('team:'.length)}`);
      }
    }
  }
  return Array.from(reviewers).sort();
};

const printComputedTeams = (reportPath, formatTeam) => {
  process.stdout.write(getComputedTeamReviewers(readReport(reportPath)).map(formatTeam).join(' '));
};

const printComputedReviewers = (reportPath) => {
  printComputedTeams(reportPath, (team) => team);
};

const printComputedMentions = (reportPath) => {
  printComputedTeams(reportPath, (team) => `@${team}`);
};

const readStdin = () =>
  new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (input += chunk));
    process.stdin.on('end', () => resolve(input));
    process.stdin.on('error', reject);
  });

const printRequestedReviewers = async () => {
  const input = await readStdin();
  const data = input.trim() ? JSON.parse(input) : {};
  const reviewRequests = asArray(data.reviewRequests);
  const entries = reviewRequests
    .map((reviewRequest) => {
      if (!reviewRequest || typeof reviewRequest !== 'object') {
        return null;
      }

      if (typeof reviewRequest.slug === 'string') {
        return toElasticTeamReviewer(reviewRequest.slug);
      }

      if (typeof reviewRequest.login === 'string') {
        return reviewRequest.login;
      }

      return null;
    })
    .filter(Boolean);

  process.stdout.write(entries.join('\n'));
};

const printUsageAndExit = () => {
  console.error(
    'Usage: helpers.js <report-metrics|untracked-packages|no-computed-reviewer-rules|reviewers|mentions|requested-reviewers> [args...]'
  );
  process.exit(1);
};

const main = async () => {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'report-metrics':
      printReportMetrics(args[0]);
      break;
    case 'untracked-packages':
      printUntrackedPackages(args[0], args[1]);
      break;
    case 'no-computed-reviewer-rules':
      printNoComputedReviewerRules(args[0], args[1]);
      break;
    case 'reviewers':
      printComputedReviewers(args[0]);
      break;
    case 'mentions':
      printComputedMentions(args[0]);
      break;
    case 'requested-reviewers':
      await printRequestedReviewers();
      break;
    default:
      printUsageAndExit();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
