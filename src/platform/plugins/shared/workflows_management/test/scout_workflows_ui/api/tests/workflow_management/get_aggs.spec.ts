/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tests for GET /api/workflows/aggs
 *
 * Finding: User-supplied field names are passed verbatim to Elasticsearch as terms-aggregation
 * keys with no allowlist. Any user with `read` privilege can probe the index structure by
 * sending arbitrary field names.
 *
 * 1a – Valid known fields return non-empty buckets (sanity / regression guard).
 * 1b – An unmapped field name returns 200 with an absent or empty bucket list
 * 1c – An ES metadata field (_id) is rejected with 400 or returns an empty bucket
 *      (regression guard: once an allowlist is added, metadata fields must be blocked).
 * 1d – Sending more than MAX_AGG_FIELDS (25) fields is rejected with 400
 *      (regression guard for the existing schema validation).
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowsApiService } from '../../../common/apis/workflows';
import { spaceTest } from '../../fixtures';

const WORKFLOW_A_YAML = `
name: Aggs Test Workflow Alpha
enabled: false
tags:
  - alpha
  - shared
triggers:
  - type: manual
steps:
  - name: noop
    type: console
    with:
      message: noop
`;

const WORKFLOW_B_YAML = `
name: Aggs Test Workflow Beta
enabled: false
tags:
  - beta
  - shared
triggers:
  - type: manual
steps:
  - name: noop
    type: console
    with:
      message: noop
`;

spaceTest.describe('GET /api/workflows/aggs', { tag: tags.deploymentAgnostic }, () => {
  let workflowsApi: WorkflowsApiService;

  spaceTest.beforeAll(async ({ apiServices }) => {
    workflowsApi = apiServices.workflowsApi;
    await workflowsApi.bulkCreate([WORKFLOW_A_YAML, WORKFLOW_B_YAML]);
  });

  spaceTest.afterAll(async () => {
    await workflowsApi.deleteAll();
  });

  // 1a — Valid known fields return aggregation buckets
  spaceTest('returns buckets for valid mapped fields (tags, createdBy)', async () => {
    const { data, status } = await workflowsApi.rawGetAggs(['tags', 'createdBy']);

    expect(status).toBe(200);
    expect(data).toBeDefined();

    // tags aggregation must contain the values we seeded
    const tagBuckets = data?.tags ?? [];
    const tagKeys = tagBuckets.map((b) => b.key);
    expect(tagKeys).toContain('alpha');
    expect(tagKeys).toContain('beta');
    expect(tagKeys).toContain('shared');

    // createdBy must return at least one entry
    const createdByBuckets = data?.createdBy ?? [];
    expect(createdByBuckets.length).toBeGreaterThan(0);
  });

  // 1a-single — Single field string also works
  spaceTest('returns buckets when a single field is passed as a string', async () => {
    const { data, status } = await workflowsApi.rawGetAggs('tags');

    expect(status).toBe(200);
    expect(data).toBeDefined();

    const tagBuckets = data?.tags ?? [];
    const tagKeys = tagBuckets.map((b) => b.key);
    expect(tagKeys).toContain('alpha');
    expect(tagKeys).toContain('shared');
  });

  // 1b — Unmapped / non-existent field: documents current permissive behaviour
  spaceTest('returns 200 with absent or empty buckets for a non-existent field', async () => {
    const { data, status } = await workflowsApi.rawGetAggs(['totallyNonExistentField99']);

    // Current behaviour: ES silently returns no buckets for unmapped fields.
    expect(status).toBe(200);
    const buckets = data?.totallyNonExistentField99;
    expect(buckets == null || (Array.isArray(buckets) && buckets.length === 0)).toBe(true);
  });

  // 1c — ES metadata field _id: regression guard
  spaceTest('rejects or returns empty buckets for the ES metadata field', async () => {
    const { status } = await workflowsApi.rawGetAggs(['_id', '_index', '_score', '_source']);
    expect(status).toBe(400);
  });

  // 1d — Exceeding MAX_AGG_FIELDS (25) is rejected by the schema (regression guard)
  spaceTest('rejects requests with more than 25 fields', async () => {
    const tooManyFields = Array.from({ length: 26 }, (_, i) => `field${i}`);
    const { status, data } = await workflowsApi.rawGetAggs(tooManyFields);

    expect(status).toBe(400);
    expect(data?.message).toContain('array size is [26], but cannot be greater than [25]');
  });
});
