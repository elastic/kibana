/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import invariant from 'node:assert';
import type api from '@elastic/elasticsearch/lib/api/types';

/**
 * Guards against a corrupted `_meta.version` on an existing index template (missing, wrong type,
 * non-positive). Call once at the boundary so downstream steps can rely on a typed value.
 */
export function assertDeployedVersion(
  existingIndexTemplate: api.IndicesGetIndexTemplateIndexTemplateItem,
  dataStreamName: string
): number {
  const deployedVersion = existingIndexTemplate.index_template?._meta?.version;
  invariant(
    typeof deployedVersion === 'number' && deployedVersion > 0,
    `Datastream ${dataStreamName} metadata is in an unexpected state, expected version to be a number but got ${deployedVersion}`
  );
  return deployedVersion;
}
