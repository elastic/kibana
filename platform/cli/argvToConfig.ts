import { set } from 'lodash';

/**
 * Extract config overrides from argv
 *
 * @param argv Argv object with key/value pairs
 */
export function argvToConfigOverrides(argv: { [key: string]: any }) {
  const config = {};

  if (argv.port != null) {
    set(config, ['server', 'port'], argv.port);
  }
  if (argv.host != null) {
    set(config, ['server', 'host'], argv.host);
  }

  return config;
}
