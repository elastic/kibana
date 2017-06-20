import { set, cloneDeep } from 'lodash';

/**
 * Applies the values from argv to the input config object and returns a new
 * config object. Does not mutate the input object.
 *
 * @param argv Argv object with key/value pairs
 * @param config Config object
 */
export function applyArgv(
  argv: { [key: string]: any },
  config: { [key: string]: any }
) {
  config = cloneDeep(config);

  if (argv.port != null) {
    set(config, ['server', 'port'], argv.port);
  }
  if (argv.host != null) {
    set(config, ['server', 'host'], argv.host);
  }

  return config;
}