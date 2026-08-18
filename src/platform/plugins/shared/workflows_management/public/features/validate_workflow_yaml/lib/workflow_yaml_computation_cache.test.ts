/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  clearWorkflowYamlComputationCache,
  getCachedWorkflowYamlComputationAsync,
  populateWorkflowYamlComputationCacheEntryForTests,
} from './workflow_yaml_computation_cache';

describe('workflow_yaml_computation_cache', () => {
  afterEach(() => {
    clearWorkflowYamlComputationCache();
  });

  it('keeps recently accessed entries when evicting beyond the max cache size', async () => {
    populateWorkflowYamlComputationCacheEntryForTests('name: keep-me\n');

    for (let index = 0; index < 32; index += 1) {
      populateWorkflowYamlComputationCacheEntryForTests(`name: evictable-${index}\n`);
    }

    populateWorkflowYamlComputationCacheEntryForTests('name: keep-me\n');
    populateWorkflowYamlComputationCacheEntryForTests('name: newest-entry\n');

    await expect(getCachedWorkflowYamlComputationAsync('name: keep-me\n')).resolves.toMatchObject({
      yamlDocument: expect.anything(),
    });
    await expect(
      getCachedWorkflowYamlComputationAsync('name: newest-entry\n')
    ).resolves.toMatchObject({
      yamlDocument: expect.anything(),
    });
    await expect(
      getCachedWorkflowYamlComputationAsync('name: evictable-0\n')
    ).resolves.toMatchObject({
      yamlDocument: expect.anything(),
    });
  });
});
