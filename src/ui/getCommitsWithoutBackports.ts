import chalk from 'chalk';
import { Commit } from '../entrypoint.module';
import { ValidConfigOptions } from '../options/options';
import { getIsCommitInBranch } from '../services/git';
import { getFirstLine } from '../services/github/commitFormatters';
import { fetchCommitsByAuthor } from '../services/github/v4/fetchCommits/fetchCommitsByAuthor';

// when the user is facing a git conflict we should help them understand
// why the conflict occurs. In many cases it's because one or more commits haven't been backported yet
export async function getCommitsWithoutBackports({
  options,
  // commit that is being backported
  commit,

  // branch the commit is being backported to
  targetBranch,

  // the files with conflicts on the target branch
  conflictingFiles,
}: {
  options: ValidConfigOptions;
  commit: Commit;
  targetBranch: string;
  conflictingFiles: string[];
}) {
  // commits on the source branch that also touched the conflicting files
  const commitsInConflictingPaths = await fetchCommitsByAuthor({
    ...options,
    author: null, // retrieve commits across all authors
    dateSince: null,
    dateUntil: commit.committedDate,
    commitPaths: conflictingFiles,
  });

  const promises = await Promise.all(
    commitsInConflictingPaths
      .filter((c) => {
        // exclude the commit we are currently trying to backport
        if (c.sha === commit.sha) {
          return false;
        }

        // exclude commits that are newer than the commit we are trying to backport
        if (c.committedDate > commit.committedDate) {
          return false;
        }

        // only consider commits that have an associated pull request
        if (!c.pullUrl) {
          return false;
        }

        // only include commit if it has an unmerged PR for the given target branch
        const hasUnmergedPr = c.expectedTargetPullRequests.some(
          (pr) => pr.branch === targetBranch && pr.state !== 'MERGED'
        );

        return hasUnmergedPr;
      })
      .slice(0, 10) // limit to max 10 commits
      .map(async (c) => {
        const results = await Promise.all(
          c.expectedTargetPullRequests.map(async (targetPr) => {
            if (!targetPr.mergeCommit) {
              return false;
            }

            return getIsCommitInBranch(options, targetPr.mergeCommit.sha);
          })
        );

        const isCommitInBranch = results.some((inBranch) => inBranch === true);
        return { c, isCommitInBranch };
      })
  );

  return promises
    .filter(({ isCommitInBranch }) => !isCommitInBranch)
    .map(({ c }) => {
      // get pull request for the target branch (if it exists)
      const pendingBackportPr = c.expectedTargetPullRequests.find(
        (pr) => pr.branch === targetBranch && pr.state === 'OPEN'
      );

      const formatted = pendingBackportPr
        ? ` - ${getFirstLine(c.originalMessage)} ${chalk.gray(
            '(backport pending)'
          )}\n   ${pendingBackportPr.url}`
        : ` - ${getFirstLine(c.originalMessage)} ${chalk.red(
            '(backport missing)'
          )}\n   ${c.pullUrl}`;

      return { formatted, commit: c };
    });
}
