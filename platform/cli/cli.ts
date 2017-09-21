// TODO Fix build system so we can switch these to `import`s
import { Observable } from 'rxjs/Observable';

const yargs = require('yargs');
import { merge } from 'lodash';

import * as args from './args';
import { version } from './version';
import { Env, RawConfigService } from '../config';
import { Root, OnShutdown } from '../root';
import { argvToConfigOverrides } from './argvToConfig';
import { LegacyPlatformProxifier, getLegacyConfig$ } from '../legacy';

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

  const onShutdown: OnShutdown = reason => {
    process.exit(reason === undefined ? 0 : 1);
  };

  let rawConfigService: RawConfigService;
  let rawConfig$: Observable<{ [key: string]: any }>;
  if (argv.kbnServer) {
    rawConfig$ = getLegacyConfig$(argv.kbnServer);
  } else {
    rawConfigService = new RawConfigService(env.getConfigFile());
    const configOverrides = argvToConfigOverrides(argv);
    rawConfigService.loadConfig();

    rawConfig$ = rawConfigService
      .getConfig$()
      .map(rawConfig => merge({}, rawConfig, configOverrides));
  }

  const root = new Root(rawConfig$, env, onShutdown);

  if (argv.kbnServer) {
    argv.kbnServer.newPlatformProxyListener = new LegacyPlatformProxifier(
      root.logger.get('legacy-platform-proxifier'),
      argv.kbnServer,
      async () => await root.start(),
      async () => await shutdown()
    );
  } else {
    root.start();
  }

  process.on(
    'SIGHUP',
    () => rawConfigService && rawConfigService.reloadConfig()
  );
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());

  async function shutdown() {
    rawConfigService && rawConfigService.stop();
    await root.shutdown();
  }
};

export const runWithLegacyKbnServer = (kbnServer: object) => run({ kbnServer });

export default (argv: Array<string>) => run(parseArgv(argv));
