/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Placeholder a bound workflow YAML uses as its `settings.run_as` value. */
export const SERVICE_ACCOUNT_ID_TOKEN = '__SERVICE_ACCOUNT_ID__';

const RUN_AS_TOKEN_LINE = new RegExp(`^( {2}run_as: )${SERVICE_ACCOUNT_ID_TOKEN}$`, 'm');

/** Replaces the `run_as: __SERVICE_ACCOUNT_ID__` placeholder with the quoted service account id. */
export const renderRunAs = (yaml: string, serviceAccountId: string): string => {
  if (typeof serviceAccountId !== 'string' || serviceAccountId.trim().length === 0) {
    throw new Error('A bound Nightshift workflow requires a serviceAccountId');
  }
  if (!RUN_AS_TOKEN_LINE.test(yaml)) {
    throw new Error(`The workflow YAML has no "run_as: ${SERVICE_ACCOUNT_ID_TOKEN}" setting`);
  }
  return yaml.replace(
    RUN_AS_TOKEN_LINE,
    (_line, prefix: string) => `${prefix}${JSON.stringify(serviceAccountId)}`
  );
};

/** Removes the `run_as: __SERVICE_ACCOUNT_ID__` line, for the unbound copy of a bound workflow. */
export const removeRunAs = (yaml: string): string => {
  if (!RUN_AS_TOKEN_LINE.test(yaml)) {
    throw new Error(`The workflow YAML has no "run_as: ${SERVICE_ACCOUNT_ID_TOKEN}" setting`);
  }
  return yaml.replace(new RegExp(`${RUN_AS_TOKEN_LINE.source}\\n`, 'm'), '');
};
