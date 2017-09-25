// TODO Fix build system so we can switch these to `import`s
const yargs = require('yargs');

import * as args from './args';
import { version } from './version';
import { Env, RawConfigService } from '../config';
import { Root, OnShutdown } from '../root';
import { argvToConfigOverrides } from './argvToConfig';
import {
  LegacyPlatformProxifier,
  getLegacyConfig$,
  LegacyKbnServer
} from '../legacy';

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
    .check(args.check(args.options)).argv;

const run = (argv: { [key: string]: any }) => {
  if (argv.help) {
    return;
  }

  const env = Env.createDefault(argv);
  const rawConfigService = new RawConfigService(env.getConfigFile());

  rawConfigService.loadConfig();

  const onShutdown: OnShutdown = reason => {
    process.exit(reason === undefined ? 0 : 1);
  };

  const rawConfig$ = rawConfigService
    .getConfig$()
    .map(rawConfig => argvToConfigOverrides(argv, rawConfig));

  const root = new Root(rawConfig$, env, onShutdown);
  root.start();

  process.on('SIGHUP', () => rawConfigService.reloadConfig());
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

  function shutdown() {
    rawConfigService.stop();
    root.shutdown();
  }
};

export const runWithLegacyKbnServer = (kbnServer: LegacyKbnServer) => {
  const root = new Root(
    getLegacyConfig$(kbnServer),
    Env.createDefault({ kbnServer }),
    () => {}
  );

  kbnServer.newPlatformProxyListener = new LegacyPlatformProxifier(
    root.logger.get('legacy-platform-proxifier'),
    () => root.start(),
    () => root.shutdown()
  );

  // TODO: Do something to reload config.
  process.on('SIGHUP', () => {});
  process.on('SIGINT', () => root.shutdown());
  process.on('SIGTERM', () => root.shutdown());
};

export default (argv: Array<string>) => run(parseArgv(argv));
