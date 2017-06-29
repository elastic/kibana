// TODO Fix build system so we can switch these to `import`s
const yargs = require('yargs');

import * as args from './args';
import { version } from './version';
import { Env } from '../config';
import { Root, OnShutdown } from '../root';
import { argvToConfigOverrides } from './argvToConfig';

export const parseArgv = (argv: Array<string>) =>
  yargs(argv)
    .usage(args.usage + '\n\n' + args.description)
    .version(version)
    .help()
    .showHelpOnFail(false, 'Specify --help for available options')
    .alias('help', 'h')
    .alias('version', 'v')
    .options(args.options)
    .epilogue(args.docs)
    .check(args.check(args.options))
    .argv;

const run = (argv: {[key: string]: any}) => {
  if (argv.help) {
    return;
  }

  const env = Env.createDefault(argv);
  const configOverrides = argvToConfigOverrides(argv);

  const onShutdown: OnShutdown = reason => {
    process.exit(reason === undefined ? 0 : 1);
  }

  const root = new Root(configOverrides, env, onShutdown);
  root.start();

  process.on('SIGHUP', () => root.reloadConfig());
  process.on('SIGINT', () => root.shutdown());
  process.on('SIGTERM', () => root.shutdown());
};

export default (argv: Array<string>) => run(parseArgv(argv));
