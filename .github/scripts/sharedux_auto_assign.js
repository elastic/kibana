/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Assigns simple PRs touching @elastic/appex-sharedux-owned files to a team
// member, round-robin. Complexity is the number of changed lines (additions +
// deletions) in files whose resolved codeowner is the team; PRs above the
// threshold, or with no team-owned files, are left unassigned.

const fs = require('fs');
const path = require('path');
const { buildCodeownersEntries, findOwners } = require('./codeowners');

const ORG = 'elastic';
const TEAM_SLUG = 'appex-sharedux';
const TEAM_HANDLE = `@${ORG}/${TEAM_SLUG}`;
// Inclusive upper bound on changed lines in team-owned files for a "simple" PR.
const MAX_CHANGED_LINES = 100;
// Team members who should not receive auto-assignments.
const EXCLUDED_LOGINS = ['alexm', 'clintandrewhall'];
const DEFAULT_CODEOWNERS_PATH = path.resolve(process.cwd(), '.github/CODEOWNERS');

const isBot = (user) => Boolean(user) && (user.type === 'Bot' || user.login.endsWith('[bot]'));

/** Changed-line total and file count for files owned by the team. */
function measureOwnedChanges(entries, files) {
  let changedLines = 0;
  let ownedFiles = 0;
  for (const file of files) {
    if (!findOwners(entries, file.filename).includes(TEAM_HANDLE)) {
      continue;
    }
    ownedFiles += 1;
    changedLines += (file.additions || 0) + (file.deletions || 0);
  }
  return { changedLines, ownedFiles };
}

/**
 * Round-robin pick: the candidate whose most recent assignment (excluding
 * their own PRs) is oldest, never-assigned candidates first. Ties resolve
 * alphabetically so a run is deterministic.
 */
function pickNextAssignee(lastAssignedAt) {
  const ranked = [...lastAssignedAt.entries()].sort(([loginA, atA], [loginB, atB]) => {
    if (atA === atB) return loginA.localeCompare(loginB);
    if (atA === null) return -1;
    if (atB === null) return 1;
    return new Date(atA).getTime() - new Date(atB).getTime();
  });
  return ranked.length > 0 ? ranked[0][0] : undefined;
}

async function listTeamMembers({ github, core }) {
  try {
    const members = await github.paginate(github.rest.teams.listMembersInOrg, {
      org: ORG,
      team_slug: TEAM_SLUG,
      per_page: 100,
    });
    return members
      .filter((member) => !isBot(member) && !EXCLUDED_LOGINS.includes(member.login))
      .map((member) => member.login);
  } catch (error) {
    core.warning(
      `Could not list members of ${TEAM_HANDLE} (HTTP ${error.status}); the token may lack ` +
        `read:org scope. Skipping auto-assignment: ${error.message}`
    );
    return [];
  }
}

/** ISO timestamp of the newest PR assigned to `login` that they did not author, or null. */
async function getLastAssignedAt({ github, owner, repo, login }) {
  const { data } = await github.rest.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:pr assignee:${login} -author:${login}`,
    sort: 'created',
    order: 'desc',
    per_page: 1,
    advanced_search: 'true',
  });
  return data.items.length > 0 ? data.items[0].created_at : null;
}

module.exports = async function shareduxAutoAssign({ github, context, core }) {
  const { owner, repo } = context.repo;
  const pr = context.payload.pull_request;
  const dryRun = process.env.DRY_RUN === 'true';

  if (pr.draft) {
    core.info(`#${pr.number} is a draft, skipping`);
    return;
  }
  if (isBot(pr.user)) {
    core.info(`#${pr.number} was opened by a bot, skipping`);
    return;
  }
  if ((pr.assignees || []).length > 0) {
    core.info(`#${pr.number} already has assignees, skipping`);
    return;
  }

  const entries = buildCodeownersEntries(
    fs.readFileSync(process.env.CODEOWNERS_PATH || DEFAULT_CODEOWNERS_PATH, 'utf8')
  );
  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const { changedLines, ownedFiles } = measureOwnedChanges(entries, files);

  if (ownedFiles === 0) {
    core.info(`#${pr.number} touches no ${TEAM_HANDLE}-owned files, skipping`);
    return;
  }
  if (changedLines > MAX_CHANGED_LINES) {
    core.info(
      `#${pr.number} changes ${changedLines} lines across ${ownedFiles} ${TEAM_HANDLE}-owned ` +
        `file(s), above the ${MAX_CHANGED_LINES}-line threshold; leaving unassigned`
    );
    return;
  }

  const candidates = (await listTeamMembers({ github, core })).filter(
    (login) => login !== pr.user.login
  );
  if (candidates.length === 0) {
    core.info(`No eligible ${TEAM_HANDLE} members to assign #${pr.number}`);
    return;
  }

  const lastAssignedAt = new Map();
  for (const login of candidates) {
    lastAssignedAt.set(login, await getLastAssignedAt({ github, owner, repo, login }));
  }
  const assignee = pickNextAssignee(lastAssignedAt);

  const summary =
    `#${pr.number} (${changedLines} changed line(s) in ${ownedFiles} ${TEAM_HANDLE}-owned ` +
    `file(s)) -> ${assignee}`;
  if (dryRun) {
    core.info(`[dry run] would assign ${summary}`);
    return;
  }

  await github.rest.issues.addAssignees({
    owner,
    repo,
    issue_number: pr.number,
    assignees: [assignee],
  });
  core.info(`Assigned ${summary}`);
};

// Exported for unit testing.
module.exports.measureOwnedChanges = measureOwnedChanges;
module.exports.pickNextAssignee = pickNextAssignee;
module.exports.MAX_CHANGED_LINES = MAX_CHANGED_LINES;
module.exports.EXCLUDED_LOGINS = EXCLUDED_LOGINS;
module.exports.TEAM_HANDLE = TEAM_HANDLE;
