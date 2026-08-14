/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stableStringify } from '@kbn/std';
import objectHash from 'object-hash';
import type { ClusterGetComponentTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IndexStorageSettings } from '..';

export interface ResolvedComponentTemplateDependency {
  name: string;
  componentTemplate?: ClusterGetComponentTemplateResponse['component_templates'][number]['component_template'];
}

export function getSchemaVersion(
  storage: IndexStorageSettings,
  componentTemplateDependencies: readonly ResolvedComponentTemplateDependency[] = []
): string {
  const versionInput = storage.componentTemplate
    ? {
        properties: storage.schema.properties,
        componentTemplate: storage.componentTemplate,
        componentTemplateDependencies,
      }
    : storage.schema.properties;
  const version = objectHash(stableStringify(versionInput));
  return version;
}
