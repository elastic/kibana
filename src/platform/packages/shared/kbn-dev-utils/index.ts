/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  CA_CERT_PATH,
  CA_TRUSTED_FINGERPRINT,
  ES_KEY_PATH,
  ES_CERT_PATH,
  ES_P12_PATH,
  ES_P12_PASSWORD,
  ES_EMPTYPASSWORD_P12_PATH,
  ES_NOPASSWORD_P12_PATH,
  KBN_KEY_PATH,
  KBN_CERT_PATH,
  KBN_P12_PATH,
  KBN_P12_PASSWORD,
  FLEET_SERVER_KEY_PATH,
  FLEET_SERVER_CERT_PATH,
  FLEET_SERVER_P12_PATH,
  FLEET_SERVER_P12_PASSWORD,
} from './src/certs';
export * from './src/dev_service_account';
export * from './src/axios';

/**
 * Lazy-loaded to keep the plugin-list CLI's transitive deps (e.g. `@kbn/dev-cli-runner`
 * → `@kbn/ci-stats-reporter` → `axios`) out of consumer import graphs such as
 * Cypress configs loaded by the Cypress-embedded `tsx`. Only `scripts/build_plugin_list_docs.js`
 * calls this.
 */
export function runPluginListCli() {
  return import('./src/plugin_list').then((m) => m.runPluginListCli());
}
export * from './src/streams';
export * from './src/extract';
export * from './src/diff_strings';
export * from './src/git';
export {
  parseAndResolveValidationContract,
  VALIDATION_PROFILE_DEFAULTS,
  type ValidationDownstreamMode,
  type ValidationProfile,
  type ResolvedValidationContract,
  type ValidationScope,
  type ValidationTestMode,
} from './src/validation_run_contract';
export * from './src/worker';
