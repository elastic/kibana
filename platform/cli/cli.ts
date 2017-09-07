// TODO Fix build system so we can switch these to `import`s
const yargs = require('yargs');
import { merge } from 'lodash';

import * as args from './args';
import { version } from './version';
import { Env, RawConfigService } from '../config';
import { Root, OnShutdown } from '../root';
import { argvToConfigOverrides } from './argvToConfig';
import { Proxy } from '../server/http/Proxy/Proxy';

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

export const run = (argv: { [key: string]: any }) => {
  if (argv.help) {
    return;
  }

  const env = Env.createDefault(argv);
  const rawConfigService = new RawConfigService(env.getConfigFile());
  const configOverrides = argvToConfigOverrides(argv);

  rawConfigService.loadConfig();

  const onShutdown: OnShutdown = reason => {
    process.exit(reason === undefined ? 0 : 1);
  };

  const rawConfig$ = rawConfigService
    .getConfig$()
    .map(rawConfig => merge({}, rawConfig, configOverrides));

  const root = new Root(rawConfig$, env, onShutdown);

  if (argv.kbnServer) {
    const proxy = (argv.kbnServer.proxy = new Proxy(
      root.logger.get('proxy'),
      argv.kbnServer
    ));
    proxy.on('platform-start', async () => await root.start());
    proxy.on('platform-stop', async () => await shutdown());
  } else {
    root.start();
  }

  process.on('SIGHUP', () => rawConfigService.reloadConfig());
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

  async function shutdown() {
    rawConfigService.stop();
    await root.shutdown();
  }
};

export default (argv: Array<string>) => run(parseArgv(argv));
