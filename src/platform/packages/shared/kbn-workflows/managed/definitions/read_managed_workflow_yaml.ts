/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules -- managed workflow definitions are server-only and read their YAML from disk on demand */
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Reads a managed workflow YAML file on every call, so the content can be garbage-collected after use.
 * The file must be excluded from transpilation via `build.noParse` in this package's `kibana.jsonc`,
 * and must not be imported as a module anywhere else.
 */
export const readManagedWorkflowYaml = (dirname: string, fileName: string): string =>
  readFileSync(join(dirname, fileName), 'utf8');
