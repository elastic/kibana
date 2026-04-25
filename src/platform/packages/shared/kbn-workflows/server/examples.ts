/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-nodejs-modules -- we need this on server to read yaml files */
import { readFile } from 'fs/promises';
import path from 'path';

import { getWorkflowExamplesDir, WORKFLOW_EXAMPLE_IDS } from '../spec/examples';

/**
 * Load the YAML content of a bundled workflow example by its catalog ID.
 * Returns `undefined` if the ID is not in the allowlist or the file cannot be read.
 */
export async function loadWorkflowExampleContent(entry: {
  id: string;
  filename: string;
}): Promise<string | undefined> {
  if (!WORKFLOW_EXAMPLE_IDS.has(entry.id)) {
    return undefined;
  }
  try {
    return await readFile(path.join(getWorkflowExamplesDir(), entry.filename), 'utf-8');
  } catch {
    return undefined;
  }
}
