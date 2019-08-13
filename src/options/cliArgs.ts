import yargs from 'yargs';
import { OptionsFromConfigFiles } from './config/config';

export type OptionsFromCliArgs = ReturnType<typeof getOptionsFromCliArgs>;
export function getOptionsFromCliArgs(
  configOptions: OptionsFromConfigFiles,
  argv: string[]
) {
  const cliArgs = yargs(argv)
    .usage('$0 [args]')
    .wrap(Math.max(100, Math.min(120, yargs.terminalWidth())))
    .option('accessToken', {
      alias: 'accesstoken',
      default: configOptions.accessToken,
      description: 'Github access token',
      type: 'string'
    })
    .option('all', {
      default: configOptions.all,
      description: 'List all commits',
      type: 'boolean'
    })
    .option('apiHostname', {
      default: configOptions.apiHostname,
      description: 'Hostname for the Github API',
      type: 'string'
    })
    .option('author', {
      default: configOptions.author,
      description: 'Show commits by specific author',
      type: 'string'
    })
    .option('branches', {
      default: [] as string[],
      description: 'Branch(es) to backport to',
      type: 'array',
      alias: 'branch',
      string: true // ensure `6.0` is not coerced to `6`
    })
    .option('commitsCount', {
      default: configOptions.commitsCount,
      description: 'Number of commits to choose from',
      type: 'number'
    })
    .option('editor', {
      default: configOptions.editor,
      description: 'Editor to be opened during conflict resolution',
      type: 'string'
    })
    .option('fork', {
      default: configOptions.fork,
      description: 'Create backports in fork or origin repo',
      type: 'boolean'
    })
    .option('gitHostname', {
      default: configOptions.gitHostname,
      description: 'Hostname for Github',
      type: 'string'
    })
    .option('labels', {
      default: configOptions.labels,
      description: 'Pull request labels',
      type: 'array'
    })
    .option('multiple', {
      default: configOptions.multiple,
      description: 'Select multiple branches/commits',
      type: 'boolean'
    })
    .option('multipleCommits', {
      default: configOptions.multipleCommits,
      description: 'Backport multiple commits',
      type: 'boolean'
    })
    .option('multipleBranches', {
      default: configOptions.multipleBranches,
      description: 'Backport to multiple branches',
      type: 'boolean'
    })
    .option('prTitle', {
      default: configOptions.prTitle,
      description: 'Title of pull request',
      type: 'string'
    })
    .option('prDescription', {
      default: configOptions.prDescription,
      description: 'Description to be added to pull request',
      type: 'string'
    })
    .option('sha', {
      description: 'Commit sha to backport',
      type: 'string',
      alias: 'commit'
    })
    .option('upstream', {
      default: configOptions.upstream,
      description: 'Name of repository',
      type: 'string'
    })
    .option('username', {
      default: configOptions.username,
      description: 'Github username',
      type: 'string'
    })
    .alias('v', 'version')
    .version()
    .help().argv;

  return {
    accessToken: cliArgs.accessToken,
    all: cliArgs.all,
    apiHostname: cliArgs.apiHostname,
    author: cliArgs.author,
    commitsCount: cliArgs.commitsCount,
    branchChoices: configOptions.branchChoices,
    branches: cliArgs.branches,
    editor: cliArgs.editor,
    fork: cliArgs.fork,
    gitHostname: cliArgs.gitHostname,
    labels: cliArgs.labels,
    multiple: cliArgs.multiple,
    multipleBranches: cliArgs.multipleBranches || cliArgs.multiple,
    multipleCommits: cliArgs.multipleCommits || cliArgs.multiple,
    prTitle: cliArgs.prTitle,
    prDescription: cliArgs.prDescription,
    sha: cliArgs.sha,
    upstream: cliArgs.upstream,
    username: cliArgs.username
  };
}
