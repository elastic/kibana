import yargs from 'yargs';
import { excludeUndefined } from '../utils/excludeUndefined';

export type OptionsFromCliArgs = ReturnType<typeof getOptionsFromCliArgs>;
export function getOptionsFromCliArgs(
  processArgs: readonly string[],
  { exitOnError = true }: { exitOnError?: boolean } = {}
) {
  const yargsInstance = yargs(processArgs)
    .parserConfiguration({
      'strip-dashed': true,
      'strip-aliased': true,
      'boolean-negation': false,
    })
    .usage('$0 [args]')
    .wrap(Math.max(100, Math.min(120, yargs.terminalWidth())))

    .option('accessToken', {
      alias: 'accesstoken',
      description: 'Github access token',
      type: 'string',
    })

    // show users own commits
    .option('all', {
      description: 'List all commits',
      alias: 'a',
      type: 'boolean',
      conflicts: 'author',
    })

    .option('assignee', {
      description: 'Add assignees to the target pull request',
      alias: 'assign',
      type: 'array',
      string: true,
      conflicts: ['autoAssign'],
    })

    .option('autoAssign', {
      description: 'Auto assign the target pull request to yourself',
      type: 'boolean',
      conflicts: ['assignees'],
    })

    .option('autoMerge', {
      description: 'Enable auto-merge for created pull requests',
      type: 'boolean',
    })

    .option('autoMergeMethod', {
      description:
        'Sets auto-merge method when using --auto-merge. Default: merge',
      type: 'string',
      choices: ['merge', 'rebase', 'squash'],
    })

    .option('ci', {
      description: 'Disable interactive prompts',
      type: 'boolean',
    })

    .option('cherrypickRef', {
      description: 'Append commit message with "(cherry picked from commit...)',
      type: 'boolean',
      conflicts: ['noCherrypickRef'],
    })

    .option('configFile', {
      description: 'Path to project config',
      type: 'string',
    })

    .option('since', {
      description: 'ISO-8601 date for filtering commits',
      type: 'string',
    })

    .option('until', {
      description: 'ISO-8601 date for filtering commits',
      type: 'string',
    })

    .option('dir', {
      description: 'Location where the temporary repository will be stored',
      type: 'string',
    })

    .option('details', {
      description: 'Show details about each commit',
      type: 'boolean',
    })

    .option('editor', {
      description: 'Editor to be opened during conflict resolution',
      type: 'string',
    })

    .option('skipRemoteConfig', {
      description:
        'Use local .backportrc.json config instead of loading from Github',
      type: 'boolean',
    })

    // push target branch to {authenticatedUsername}/{repoName}
    .option('fork', {
      description: 'Create backports in fork or origin repo',
      type: 'boolean',
      conflicts: ['noFork'],
    })

    .option('gitHostname', {
      hidden: true,
      description: 'Hostname for Github',
      type: 'string',
    })

    .option('githubApiBaseUrlV3', {
      hidden: true,
      description: `Base url for Github's REST (v3) API`,
      type: 'string',
    })

    .option('githubApiBaseUrlV4', {
      hidden: true,
      description: `Base url for Github's GraphQL (v4) API`,
      type: 'string',
    })

    .option('logFilePath', {
      hidden: true,
      description: `Path to log file`,
      type: 'string',
    })

    .option('mainline', {
      description:
        'Parent id of merge commit. Defaults to 1 when supplied without arguments',
      type: 'number',
      coerce: (mainline) => {
        if (mainline === undefined) {
          // return 1 if `--mainline` is given without a value
          // return undefined if --mainline is not supplied at all
          return processArgs.includes('--mainline') ? 1 : undefined;
        }

        // use specified mainline parent
        if (Number.isInteger(mainline)) {
          return mainline as number;
        }

        // Invalid value provided
        throw new Error(`--mainline must be an integer. Received: ${mainline}`);
      },
    })

    // display 10 commits to pick from
    .option('maxNumber', {
      description: 'Number of commits to choose from',
      alias: ['number', 'n'],
      type: 'number',
    })

    // cli-only
    .option('multiple', {
      description: 'Select multiple branches/commits',
      type: 'boolean',
      conflicts: ['multipleBranches', 'multipleCommits'],
    })

    // allow picking multiple target branches
    .option('multipleBranches', {
      description: 'Backport to multiple branches',
      type: 'boolean',
      conflicts: ['multiple'],
    })

    // allow picking multiple commits
    .option('multipleCommits', {
      description: 'Backport multiple commits',
      type: 'boolean',
      conflicts: ['multiple'],
    })

    .option('noCherrypickRef', {
      description:
        'Do not append commit message with "(cherry picked from commit...)"',
      type: 'boolean',
      conflicts: ['cherrypickRef'],
    })

    .option('noStatusComment', {
      description: "Don't publish status comment to Github",
      type: 'boolean',
    })

    .option('noVerify', {
      description: 'Bypass the pre-commit and commit-msg hooks',
      type: 'boolean',
    })

    .option('noFork', {
      description: 'Create backports in the origin repo',
      type: 'boolean',
      conflicts: ['fork'],
    })

    .option('path', {
      description: 'Only list commits touching files under the specified path',
      alias: 'p',
      type: 'array',
      string: true,
    })

    .option('prDescription', {
      description: 'Description to be added to pull request',
      alias: 'description',
      type: 'string',
    })

    .option('prTitle', {
      description: 'Title of pull request',
      alias: 'title',
      type: 'string',
    })

    .option('prFilter', {
      conflicts: ['pullNumber', 'sha'],
      description: `Filter source pull requests by a query`,
      type: 'string',
    })

    .option('pullNumber', {
      conflicts: ['sha', 'prFilter'],
      description: 'Pull request to backport',
      alias: 'pr',
      type: 'number',
    })

    .option('resetAuthor', {
      description: 'Set yourself as commit author',
      type: 'boolean',
    })

    .option('reviewer', {
      description: 'Add reviewer to the target PR',
      type: 'array',
      string: true,
    })

    .option('repoOwner', {
      description: 'Repository owner',
      type: 'string',
    })

    .option('repoName', {
      description: 'Repository name',
      type: 'string',
    })

    .option('sha', {
      conflicts: ['pullNumber', 'prFilter'],
      description: 'Commit sha to backport',
      alias: 'commit',
      type: 'string',
    })

    .option('sourceBranch', {
      description: `Specify a non-default branch (normally "master") to backport from`,
      type: 'string',
    })

    .option('sourcePRLabel', {
      description: 'Add labels to the source (original) PR',
      alias: 'sourcePrLabel',
      type: 'array',
      string: true,
    })

    .option('targetBranch', {
      description: 'Branch(es) to backport to',
      alias: ['branch', 'b'],
      type: 'array',
      string: true, // ensure `6.0` is not coerced to `6`
    })

    .option('targetBranchChoice', {
      description: 'List branches to backport to',
      type: 'array',
      string: true,
    })

    .option('targetPRLabel', {
      description: 'Add labels to the target (backport) PR',
      alias: ['label', 'l'],
      type: 'array',
      string: true,
    })

    .option('author', {
      description: 'Show commits by a specific user',
      alias: 'author',
      type: 'string',
      conflicts: 'all',
    })

    .option('verbose', {
      description: 'Show additional debug information',
      type: 'boolean',
    })

    // cli-only
    .option('verify', {
      description: `Opposite of no-verify`,
      type: 'boolean',
    })

    .alias('version', 'v')
    .alias('version', 'V')
    .help()

    .epilogue(
      'For bugs, feature requests or questions: https://github.com/sqren/backport/issues\nOr contact me directly: https://twitter.com/sorenlouv'
    );

  // don't kill process upon error
  // and don't log error to console
  if (!exitOnError) {
    yargsInstance.fail((msg, err) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (err) {
        throw err;
      }

      throw new Error(msg);
    });
  }

  const {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    $0,
    _,
    /* eslint-enable @typescript-eslint/no-unused-vars */
    multiple,
    multipleBranches,
    multipleCommits,
    all,

    // filters
    author,
    since,
    until,

    // negations
    noCherrypickRef,
    noFork,
    noStatusComment,
    noVerify,
    verify,

    // array types (should be renamed to plural form)
    assignee,
    path,
    reviewer,
    sourcePRLabel,
    targetBranch,
    targetBranchChoice,
    targetPRLabel,

    ...restOptions
  } = yargsInstance.parseSync();

  return excludeUndefined({
    ...restOptions,

    // filters
    author: all ? null : author,
    dateSince: since,
    dateUntil: until,

    // `multiple` is a cli-only flag to override `multipleBranches` and `multipleCommits`
    multipleBranches: multiple ?? multipleBranches,
    multipleCommits: multiple ?? multipleCommits,

    // rename array types to plural
    assignees: assignee,
    commitPaths: path,
    reviewers: reviewer,
    sourcePRLabels: sourcePRLabel,
    targetBranchChoices: targetBranchChoice,
    targetBranches: targetBranch,
    targetPRLabels: targetPRLabel,

    // negations (cli-only flags)
    cherrypickRef: noCherrypickRef === true ? false : restOptions.cherrypickRef,
    fork: noFork === true ? false : restOptions.fork,
    noVerify: verify ?? noVerify,
    publishStatusComment: noStatusComment === true ? false : undefined,
  });
}
