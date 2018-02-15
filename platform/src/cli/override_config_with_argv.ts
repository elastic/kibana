import { RawConfig } from '../config';

/**
 * Overrides some config values with ones from argv.
 *
 * @param config `RawConfig` instance to update config values for.
 * @param argv Argv object with key/value pairs.
 */
export function overrideConfigWithArgv(
  config: RawConfig,
  argv: { [key: string]: any }
) {
  if (argv.port != null) {
    config.set(['server', 'port'], argv.port);
  }

  if (argv.host != null) {
    config.set(['server', 'host'], argv.host);
  }

  return config;
}
