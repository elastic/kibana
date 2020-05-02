import yargs from 'yargs';
import { OptionsFromConfigFiles } from './config/config';

export type OptionsFromCliArgs = ReturnType<typeof getOptionsFromCliArgs>;
export function getOptionsFromCliArgs(
  configOptions: OptionsFromConfigFiles,
  argv: readonly string[]
) {
  const cliArgs = yargs(argv)
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
    .option('all', {
      default: configOptions.all,
      description: 'List all commits',
      alias: 'a',
      type: 'boolean',
    })
    .option('author', {
      default: configOptions.author,
      description: 'Show commits by specific author',
      type: 'string',
    })
    .option('maxNumber', {
      default: configOptions.maxNumber,
      description: 'Number of commits to choose from',
      alias: ['number', 'n'],
      type: 'number',
    })
    .option('dryRun', {
      default: false,
      description: 'Perform backport without pushing to Github',
      type: 'boolean',
    })
    .option('editor', {
      default: configOptions.editor,
      description: 'Editor to be opened during conflict resolution',
      type: 'string',
    })
    .option('fork', {
      default: configOptions.fork,
      description: 'Create backports in fork or origin repo',
      type: 'boolean',
    })
    .option('gitHostname', {
      hidden: true,
      default: configOptions.gitHostname,
      description: 'Hostname for Github',
      type: 'string',
    })
    .option('githubApiBaseUrlV3', {
      hidden: true,
      default: configOptions.githubApiBaseUrlV3,
      description: `Base url for Github's REST (v3) API`,
      type: 'string',
    })
    .option('githubApiBaseUrlV4', {
      hidden: true,
      default: configOptions.githubApiBaseUrlV4,
      description: `Base url for Github's GraphQL (v4) API`,
      type: 'string',
    })
    .option('mainline', {
      description:
        'Parent id of merge commit. Defaults to 1 when supplied without arguments',
      type: 'number',
      coerce: (mainline) => {
        // `--mainline` (default to 1 when no parent is given)
        if (mainline === undefined) {
          return 1;
        }

        // use specified mainline parent
        if (Number.isInteger(mainline)) {
          return mainline as number;
        }

        // Invalid value provided
        throw new Error(`--mainline must be an integer. Received: ${mainline}`);
      },
    })
    .option('multiple', {
      default: configOptions.multiple,
      description: 'Select multiple branches/commits',
      type: 'boolean',
    })
    .option('multipleCommits', {
      default: configOptions.multipleCommits,
      description: 'Backport multiple commits',
      type: 'boolean',
    })
    .option('multipleBranches', {
      default: configOptions.multipleBranches,
      description: 'Backport to multiple branches',
      type: 'boolean',
    })
    .option('noVerify', {
      default: configOptions.noVerify,
      description: 'Bypasses the pre-commit and commit-msg hooks',
      type: 'boolean',
    })
    .option('path', {
      default: configOptions.path,
      description: 'Only list commits touching files under the specified path',
      alias: 'p',
      type: 'string',
    })
    .option('prTitle', {
      default: configOptions.prTitle,
      description: 'Title of pull request',
      alias: 'title',
      type: 'string',
    })
    .option('prDescription', {
      default: configOptions.prDescription,
      description: 'Description to be added to pull request',
      alias: 'description',
      type: 'string',
    })
    .option('pullNumber', {
      conflicts: ['sha', 'sourcePRsFilter'],
      description: 'Pull request to backport',
      type: 'number',
      alias: 'pr',
    })
    .option('resetAuthor', {
      default: false,
      description: 'Set yourself as commit author',
      type: 'boolean',
    })
    .option('sha', {
      conflicts: ['pullNumber', 'sourcePRsFilter'],
      description: 'Commit sha to backport',
      type: 'string',
      alias: 'commit',
    })
    .option('sourcePRLabels', {
      default: configOptions.sourcePRLabels,
      description: 'Add labels to the source (original) PR',
      type: 'array',
      alias: 'sourcePRLabel',
    })
    .option('sourcePRsFilter', {
      conflicts: ['pullNumber', 'sha'],
      // default: configOptions.githubApiBaseUrlV4,
      description: `Filter source pull requests by a query`,
      alias: 'pr-filter',
      type: 'string',
    })
    .option('sourceBranch', {
      default: configOptions.sourceBranch,
      description: `List commits to backport from another branch than master`,
      type: 'string',
    })
    .option('verify', {
      description: `Opposite of no-verify`,
      type: 'boolean',
    })
    .option('targetBranches', {
      default: [] as string[],
      description: 'Branch(es) to backport to',
      type: 'array',
      alias: ['targetBranch', 'branch', 'b'],
      string: true, // ensure `6.0` is not coerced to `6`
    })
    .option('targetPRLabels', {
      default: configOptions.targetPRLabels,
      description: 'Add labels to the target (backport) PR',
      alias: ['labels', 'label', 'l'],
      type: 'array',
    })
    .option('upstream', {
      default: configOptions.upstream,
      description: 'Name of repository',
      alias: 'up',
      type: 'string',
    })
    .option('username', {
      default: configOptions.username,
      description: 'Github username',
      type: 'string',
    })
    .option('verbose', {
      default: false,
      description: 'Show additional debug information',
      type: 'boolean',
    })
    .alias('version', 'v')
    .alias('version', 'V')
    .help()
    .epilogue(
      'For bugs, feature requests or questions: https://github.com/sqren/backport/issues\nOr contact me directly: https://twitter.com/sorenlouv'
    ).argv;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  const { $0, _, verify, ...rest } = cliArgs;

  return {
    ...rest,
    accessToken: cliArgs.accessToken || configOptions.accessToken, // accessToken should not be displayed in yargs help menu
    branchLabelMapping: configOptions.branchLabelMapping, // not available as cli argument
    multipleBranches: cliArgs.multipleBranches || cliArgs.multiple,
    multipleCommits: cliArgs.multipleCommits || cliArgs.multiple,
    noVerify: verify ?? rest.noVerify, // `verify` is a cli-only flag to flip the default of `no-verify`
    targetBranchChoices: configOptions.targetBranchChoices, // not available as cli argument
  };
}
