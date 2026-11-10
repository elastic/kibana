/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManagedWorkflowDefinition } from './types';

/** The YAML a definition hash covers: `yaml`, or `yamlTemplate` rendered with its `hashValues`. */
export const getManagedWorkflowHashedYaml = (definition: ManagedWorkflowDefinition): string => {
  const { id, yaml, yamlTemplate } = definition;
  if (yamlTemplate) {
    const { hashValues, render } = yamlTemplate;
    return render(hashValues);
  }
  if (!yaml) {
    throw new Error(`Managed workflow '${id}' must define either yaml or yamlTemplate`);
  }
  return yaml;
};
