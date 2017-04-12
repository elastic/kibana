// @flow

import { has, set } from 'lodash';
import { readFileSync as read } from 'fs';
import { safeLoad } from 'js-yaml';

import { merge } from '../config/mergeConfig';

const toArray = (value: string | Array<string>) => [].concat(value || []);
const readYaml = (path: string) => safeLoad(read(path, 'utf8'));

const readFiles = (paths: string | Array<string>) =>
  merge(toArray(paths).map(readYaml));

export function getRawConfig(argv: { [key: string]: any }) {
  const config = readFiles(argv.config);

  if (argv.dev) {
    set(config, ['env'], 'development');

    if (argv.ssl) {
      set(config, ['server', 'ssl', 'enabled'], true);

      if (
        !has(config, ['server', 'ssl', 'certificate']) &&
        !has(config, ['server', 'ssl', 'key'])
      ) {
        // TODO fix contants
        set(config, ['server', 'ssl', 'certificate'], 'DEV_SSL_CERT_PATH');
        set(config, ['server', 'ssl', 'key'], 'DEV_SSL_KEY_PATH');
      }
    }
  }

  if (argv.elasticsearch != null) {
    set(config, ['elasticsearch', 'url'], argv.elasticsearch);
  }
  if (argv.port != null) {
    set(config, ['server', 'port'], argv.port);
  }
  if (argv.host != null) {
    set(config, ['server', 'host'], argv.host);
  }
  if (argv.quiet) {
    set(config, ['logging', 'quiet'], true);
  }
  if (argv.silent) {
    set(config, ['logging', 'silent'], true);
  }
  if (argv.verbose) {
    set(config, ['logging', 'verbose'], true);
  }
  if (argv.logFile != null) {
    set(config, ['logging', 'dest'], argv.logFile);
  }

  return config;
}
