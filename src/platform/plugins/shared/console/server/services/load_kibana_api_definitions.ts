/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globSync, readFileSync } from 'fs';
import { join } from 'path';
import normalizePath from 'normalize-path';
import type { EndpointDefinition, EndpointDescription } from '../../common/types';
import { KIBANA_API_DEFINITIONS_FOLDER, GENERATED_SUBFOLDER } from '../../common/constants';

/**
 * Loads the generated Kibana API endpoint definitions (one file per operation) into
 * a single map keyed by endpoint name. Kept separate from the Elasticsearch
 * definitions so `kbn:` and Elasticsearch endpoints never share a namespace.
 */
export const loadKibanaApiDefinitions = (): Record<string, EndpointDescription> => {
  // paths are normalized for windows, see https://github.com/elastic/kibana/issues/151032
  const files = globSync(
    normalizePath(join(KIBANA_API_DEFINITIONS_FOLDER, GENERATED_SUBFOLDER, '*.json'))
  );

  const endpoints: Record<string, EndpointDescription> = {};
  files.forEach((file) => {
    const definition: EndpointDefinition = JSON.parse(readFileSync(normalizePath(file), 'utf8'));
    Object.assign(endpoints, definition);
  });
  return endpoints;
};
