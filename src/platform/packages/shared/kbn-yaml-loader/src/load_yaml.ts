/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Loads the yaml package asynchronously. Use this in browser code to avoid
 * pulling the full yaml library into the initial bundle.
 * The returned promise resolves to the yaml module (parse, stringify, Document, etc.).
 */
export const loadYaml = (): Promise<typeof import('yaml')> => {
  return import('yaml');
};
