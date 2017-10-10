import { accessSync, constants as fsConstants } from 'fs';
import { resolve } from 'path';
import * as chalk from 'chalk';
import { Options as ArgvOptions } from 'yargs';

const { R_OK } = fsConstants;

export const usage = 'Usage: bin/kibana [options]';
export const description =
  'Kibana is an open source (Apache Licensed), browser-based analytics and search dashboard for Elasticsearch.';
export const docs = 'Documentation: https://elastic.co/kibana';

export const options: { [key: string]: ArgvOptions } = {
  config: {
    alias: 'c',
    description:
      'Path to the config file, can be changed with the ' +
      '`CONFIG_PATH` environment variable as well.',
    type: 'string',
    coerce: arg => {
      if (typeof arg === 'string') {
        return resolve(arg);
      }
      return arg;
    },
    requiresArg: true
  },
  elasticsearch: {
    alias: 'e',
    description: 'URI for Elasticsearch instance',
    type: 'string',
    requiresArg: true
  },
  host: {
    alias: 'H',
    description: 'The host to bind to',
    type: 'string',
    requiresArg: true
  },
  port: {
    alias: 'p',
    description: 'The port to bind Kibana to',
    type: 'number',
    requiresArg: true
  },
  quiet: {
    alias: 'q',
    description: 'Prevent all logging except errors'
    //conflicts: 'silent'
    // conflicts: ['quiet', 'verbose']
  },
  silent: {
    alias: 'Q',
    description: 'Prevent all logging'
    //conflicts: 'quiet'
    // conflicts: ['silent', 'verbose']
  },
  verbose: {
    description: 'Turns on verbose logging'
    // conflicts: ['silent', 'quiet']
  },
  'log-file': {
    alias: 'l',
    description: 'The file to log to',
    type: 'string',
    requiresArg: true
  },
  'plugin-dir': {},
  dev: {
    description: 'Run the server with development mode defaults'
  },
  ssl: {
    description:
      'Dev only. Specify --no-ssl to not run the dev server using HTTPS',
    type: 'boolean',
    default: true
  },
  'base-path': {
    description:
      'Dev only. Specify --no-base-path to not put a proxy with a random base path in front of the dev server',
    type: 'boolean',
    default: true
  },
  watch: {
    description:
      'Dev only. Specify --no-watch to prevent automatic restarts of the server in dev mode',
    type: 'boolean',
    default: true
  }
};

const fileExists = (configPath: string): boolean => {
  try {
    accessSync(configPath, R_OK);
    return true;
  } catch (e) {
    return false;
  }
};

function ensureConfigExists(path: string) {
  if (!fileExists(path)) {
    throw new Error(`Config file [${path}] does not exist`);
  }
}

function snakeToCamel(s: string) {
  return s.replace(/(\-\w)/g, m => m[1].toUpperCase());
}

export const check = (options: { [key: string]: any }) => (argv: {
  [key: string]: any;
}) => {
  // throw Error here to show error message

  const config = argv.config;

  // ensure config file exists
  if (typeof config === 'string') {
    ensureConfigExists(config);
  }
  if (Array.isArray(config)) {
    throw new Error(`Multiple config files is not allowed`);
  }

  if (argv.port !== undefined && isNaN(argv.port)) {
    throw new Error(`[port] must be a number, but was a string`);
  }

  // make sure only allowed options are specified
  const yargsSpecialOptions = ['$0', '_', 'help', 'h', 'version', 'v'];
  const allowedOptions = Object.keys(options).reduce(
    (allowed, option) =>
      allowed
        .add(option)
        .add(snakeToCamel(option))
        .add(options[option].alias || option),
    new Set(yargsSpecialOptions)
  );
  const unrecognizedOptions = Object.keys(argv).filter(
    arg => !allowedOptions.has(arg)
  );

  if (unrecognizedOptions.length) {
    throw new Error(
      `The following options were not recognized:\n` +
        `  ${chalk.bold(JSON.stringify(unrecognizedOptions))}`
    );
  }

  return true;
};
