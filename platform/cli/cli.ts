// TODO Fix build system so we can switch these to `import`s
const yargs = require('yargs');

import * as args from './args';
import { version } from './version';
import { Env } from '../config';
import { Root } from '../root';

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

  const env = Env.createDefault();

  const root = new Root(argv, env);
  root.start();

  process.on('SIGHUP', () => root.reloadConfig());
  process.on('SIGINT', () => root.shutdown());
  process.on('SIGTERM', () => root.shutdown());
};

export default (argv: Array<string>) => run(parseArgv(argv));
