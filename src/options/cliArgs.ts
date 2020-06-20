import isString from 'lodash.isstring';
import yargs from 'yargs';
import { OptionsFromConfigFiles } from './config/config';

type Maybe<T> = T | undefined;
type BranchLabelMapping = Record<string, string> | undefined;
type BranchChoiceRaw = string | BranchChoice;
export interface BranchChoice {
  name: string;
  checked?: boolean;
}

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
      default: configOptions.accessToken as Maybe<string>,
      alias: 'accesstoken',
      description: 'Github access token',
      type: 'string',
    })

    // show users own commits
    .option('all', {
      default: (configOptions.all ?? false) as boolean,
      description: 'List all commits',
      alias: 'a',
      type: 'boolean',
    })

    .option('author', {
      default: configOptions.author as Maybe<string>,
      description: 'Show commits by specific author',
      type: 'string',
    })

    .option('dryRun', {
      default: false,
      description: 'Perform backport without pushing to Github',
      type: 'boolean',
    })

    .option('editor', {
      default: configOptions.editor as Maybe<string>,
      description: 'Editor to be opened during conflict resolution',
      type: 'string',
    })

    // push target branch to {username}/{repoName}
    .option('fork', {
      default: (configOptions.fork ?? true) as boolean,
      description: 'Create backports in fork or origin repo',
      type: 'boolean',
    })

    .option('gitHostname', {
      hidden: true,
      default: (configOptions.gitHostname ?? 'github.com') as string,
      description: 'Hostname for Github',
      type: 'string',
    })

    .option('githubApiBaseUrlV3', {
      hidden: true,
      default: (configOptions.githubApiBaseUrlV3 ??
        'https://api.github.com') as string,
      description: `Base url for Github's REST (v3) API`,
      type: 'string',
    })

    .option('githubApiBaseUrlV4', {
      hidden: true,
      default: (configOptions.githubApiBaseUrlV4 ??
        'https://api.github.com/graphql') as string,
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

    // display 10 commits to pick from
    .option('maxNumber', {
      default: (configOptions.maxNumber ?? 10) as number,
      description: 'Number of commits to choose from',
      alias: ['number', 'n'],
      type: 'number',
    })

    // cli-only
    .option('multiple', {
      description: 'Select multiple branches/commits',
      type: 'boolean',
    })

    // allow picking multiple target branches
    .option('multipleBranches', {
      default: (configOptions.multipleBranches ?? true) as boolean,
      description: 'Backport to multiple branches',
      type: 'boolean',
    })

    // allow picking multiple commits
    .option('multipleCommits', {
      default: (configOptions.multipleCommits ?? false) as boolean,
      description: 'Backport multiple commits',
      type: 'boolean',
    })

    .option('noVerify', {
      default: (configOptions.noVerify ?? true) as boolean,
      description: 'Bypasses the pre-commit and commit-msg hooks',
      type: 'boolean',
    })

    .option('path', {
      default: configOptions.path as Maybe<string>,
      description: 'Only list commits touching files under the specified path',
      alias: 'p',
      type: 'string',
    })

    .option('prTitle', {
      default: (configOptions.prTitle ??
        '[{targetBranch}] {commitMessages}') as string,
      description: 'Title of pull request',
      alias: 'title',
      type: 'string',
    })

    .option('prDescription', {
      default: configOptions.prDescription as Maybe<string>,
      description: 'Description to be added to pull request',
      alias: 'description',
      type: 'string',
    })

    .option('prFilter', {
      default: configOptions.prFilter as Maybe<string>,
      conflicts: ['pullNumber', 'sha'],
      description: `Filter source pull requests by a query`,
      type: 'string',
    })

    // cli-only
    .option('pullNumber', {
      conflicts: ['sha', 'prFilter'],
      description: 'Pull request to backport',
      alias: 'pr',
      type: 'number',
    })

    // cli-only
    .option('resetAuthor', {
      default: false,
      description: 'Set yourself as commit author',
      type: 'boolean',
    })

    // cli-only
    .option('sha', {
      conflicts: ['pullNumber', 'prFilter'],
      description: 'Commit sha to backport',
      alias: 'commit',
      type: 'string',
    })

    .option('sourceBranch', {
      default: configOptions.sourceBranch as Maybe<string>,
      description: `List commits to backport from another branch than master`,
      type: 'string',
    })

    .option('sourcePRLabels', {
      default: (configOptions.sourcePRLabels ?? []) as string[],
      description: 'Add labels to the source (original) PR',
      alias: 'sourcePRLabel',
      type: 'array',
    })

    .option('targetBranches', {
      default: (configOptions.targetBranches || []) as string[],
      description: 'Branch(es) to backport to',
      alias: ['targetBranch', 'branch', 'b'],
      type: 'array',
      string: true, // ensure `6.0` is not coerced to `6`
    })

    .option('targetBranchChoices', {
      // backwards-compatability: `branches` was renamed `targetBranchChoices`
      default: (configOptions.targetBranchChoices ??
        configOptions.branches ??
        []) as BranchChoiceRaw[],
      description: 'List branches to backport to',
      alias: 'targetBranchChoice',
      type: 'array',
    })

    .option('targetPRLabels', {
      // backwards-compatability: `labels` was renamed `targetPRLabels`
      default: (configOptions.targetPRLabels ??
        configOptions.labels ??
        []) as string[],
      description: 'Add labels to the target (backport) PR',
      alias: ['labels', 'label', 'l'],
      type: 'array',
    })

    // cli-only
    .option('verify', {
      description: `Opposite of no-verify`,
      type: 'boolean',
    })

    .option('upstream', {
      default: configOptions.upstream as Maybe<string>,
      description: 'Name of repository',
      alias: 'up',
      type: 'string',
    })

    .option('username', {
      default: configOptions.username as Maybe<string>,
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
  const { $0, _, verify, multiple, ...rest } = cliArgs;

  return {
    ...rest,

    // `branchLabelMapping` is not available as cli argument
    branchLabelMapping: configOptions.branchLabelMapping as BranchLabelMapping,

    // `multiple` is a cli-only flag to override `multipleBranches` and `multipleCommits`
    multipleBranches: multiple ?? cliArgs.multipleBranches,
    multipleCommits: multiple ?? cliArgs.multipleCommits,

    // `verify` is a cli-only flag to flip the default of `no-verify`
    noVerify: verify ?? rest.noVerify,

    // convert from array of primitives to array of object
    targetBranchChoices: getTargetBranchChoicesAsObject(
      rest.targetBranchChoices
    ),
  };
}

// in the config `branches` can either be a string or an object.
// We need to transform it so that it is always treated as an object troughout the application
function getTargetBranchChoicesAsObject(
  targetBranchChoices: BranchChoiceRaw[]
): BranchChoice[] {
  return targetBranchChoices.map((choice) => {
    if (isString(choice)) {
      return {
        name: choice,
        checked: false,
      };
    }

    return choice;
  });
}
