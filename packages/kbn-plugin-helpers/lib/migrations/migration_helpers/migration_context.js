// The migration context object contains all of the data and functions
// that are necessary to analyze and run migrations.

import moment from 'moment';
import { validatePlugins } from './plugins';
import { buildMigrationPlan } from './migration_plan';
import { fetchMigrationState } from './persistence';

export async function fetchMigrationContext(opts) {
  opts = validateOpts(opts);
  const { migrationState, migrationStateVersion } = await fetchMigrationState(opts.callCluster, opts.index);
  const plugins = validatePlugins(opts.plugins, migrationState);
  const migrationPlan = buildMigrationPlan(plugins, migrationState);
  return {
    ...opts,
    migrationState,
    migrationStateVersion,
    plugins,
    migrationPlan,
    destIndex: opts.destIndex || `${opts.index}-${moment().format('YYYYMMDDHHmmss')}`,
    initialIndex: opts.initialIndex || `${opts.index}-original`,
    log: migrationLogger(opts.log),
  };
}

// Validates the MigrationOpts argument which is passed to all public / exported migration
// functions. This should provide devs who consume migrations with friendly diagnostic errors
// if they fail to pass the correct arguments.
function validateOpts(opts) {
  function validateProp(prop, type, isValid) {
    const value = opts[prop];
    isValid = isValid || (() => typeof value === type);
    if (!isValid(value)) {
      throw new Error(`MigrationOpts: property ${prop} must be a ${type}. Got ${typeof value}: ${value}`);
    }
  }

  validateProp('index', 'string');
  validateProp('callCluster', 'function');
  validateProp('log', 'function');
  validateProp('plugins', 'array', (v) => Array.isArray(v));
  validateProp('destIndex', 'string', (v) => v === undefined || typeof v === 'string');
  validateProp('initialIndex', 'string', (v) => v === undefined || typeof v === 'string');

  return opts;
}

function migrationLogger(log) {
  const logFn = prefix => msg => log(prefix, typeof msg === 'function' ? msg() : msg);
  const logger = (...args) => log(...args);
  logger.info = logFn(['info', 'migration']);

  // Temporarily change this to info, to see migration debug logs without
  // all the noise of normal Kibana debug logs.
  logger.debug = logFn(['debug', 'migration']);

  return logger;
}
