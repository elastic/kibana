// @flow

import yargs, { type Argv } from 'yargs';
import { BehaviorSubject } from 'rxjs';

import * as args from './args';
import { getRawConfig } from './readConfig';
import pkg from '../../src/utils/package_json';

import { Config } from '../config';
import { Server } from '../server';

export const parseArgv = (argv: Array<string>) =>
  yargs(argv)
    .usage(args.usage + '\n\n' + args.description)
    .version(pkg.version)
    .help()
    .showHelpOnFail(false, 'Specify --help for available options')
    .alias('help', 'h')
    .alias('version', 'v')
    .options(args.options)
    .epilogue(args.docs)
    .check(args.check(args.options)).argv;

const run = (argv: Argv) => {
  if (argv.help) {
    return;
  }

  const argv$ = new BehaviorSubject(argv);
  const config$ = argv$
    .map(getRawConfig)
    .map(rawConfig => Config.create(rawConfig));

  const server = new Server(config$);
  server.start();
};

export default (argv: Array<string>) => run(parseArgv(argv));
