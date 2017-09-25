import { RawConfig } from '../config';

/**
 * Extract config overrides from argv
 *
 * @param argv Argv object with key/value pairs
 */
export function argvToConfigOverrides(
  argv: { [key: string]: any },
  config: RawConfig
) {
  if (argv.port != null) {
    config.set(['server', 'port'], argv.port);
  }

  if (argv.host != null) {
    config.set(['server', 'host'], argv.host);
  }

  return config;
}
