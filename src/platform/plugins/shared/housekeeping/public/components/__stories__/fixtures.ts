/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HousekeepingFindingGroup, HousekeepingFindingsResponse } from '../../../common';
import type { FindingsState } from '../../findings_store';

export const resourceTypes: HousekeepingFindingsResponse['resourceTypes'] = {
  index_template: { label: 'Index template' },
  component_template: { label: 'Component template' },
  data_stream: { label: 'Data stream' },
  index: { label: 'Index' },
  ingest_pipeline: { label: 'Ingest pipeline' },
  ilm_policy: { label: 'Lifecycle policy' },
};

const PIPELINE_IMPACT =
  'Elasticsearch rejects the documents sent here until the pipeline exists or the setting changes.';

export const missingPipelines: HousekeepingFindingGroup = {
  id: 'broken_reference:ingest_pipeline',
  kind: 'broken_reference',
  title: 'Missing ingest pipeline',
  description: 'The resources below point to something that does not exist.',
  findings: [
    {
      id: 'broken_reference|ingest_pipeline:app-parent|ingest_pipeline:app-child',
      resource: { type: 'ingest_pipeline', id: 'app-parent' },
      related: [{ type: 'ingest_pipeline', id: 'app-child' }],
      message: 'Documents that reach this pipeline processor fail.',
      details: ['pipeline processor points to app-child, which does not exist.'],
    },
    {
      id: 'broken_reference|index_template:logs-app|ingest_pipeline:app-v1',
      resource: { type: 'index_template', id: 'logs-app' },
      related: [{ type: 'ingest_pipeline', id: 'app-v1' }],
      message: PIPELINE_IMPACT,
      details: ['index.default_pipeline points to app-v1, which does not exist.'],
    },
    {
      id: 'broken_reference|index:orders|ingest_pipeline:app-v1',
      resource: { type: 'index', id: 'orders' },
      related: [{ type: 'ingest_pipeline', id: 'app-v1' }],
      message: PIPELINE_IMPACT,
      details: [
        'index.default_pipeline, index.final_pipeline point to app-v1, which does not exist.',
      ],
    },
  ],
};

export const missingPolicies: HousekeepingFindingGroup = {
  id: 'broken_reference:ilm_policy',
  kind: 'broken_reference',
  title: 'Missing lifecycle policy',
  description: 'The resources below point to something that does not exist.',
  findings: [
    {
      id: 'broken_reference|data_stream:logs-app-default|ilm_policy:app-retention',
      resource: { type: 'data_stream', id: 'logs-app-default' },
      related: [{ type: 'ilm_policy', id: 'app-retention' }],
      message:
        'ILM does not manage these indices, so they are never rolled over or deleted and keep growing.',
      details: ['index.lifecycle.name points to app-retention, which does not exist.'],
    },
  ],
};

export const unusedPipelines: HousekeepingFindingGroup = {
  id: 'unused:ingest_pipeline',
  kind: 'unused',
  title: 'Unused ingest pipeline',
  description:
    'No index, template or other pipeline uses this pipeline, and it has not processed any document since the nodes started.',
  findings: [
    {
      id: 'unused|ingest_pipeline:app-v0',
      resource: { type: 'ingest_pipeline', id: 'app-v0' },
      related: [],
    },
  ],
};

export const unusedPolicies: HousekeepingFindingGroup = {
  id: 'unused:ilm_policy',
  kind: 'unused',
  title: 'Unused lifecycle policy',
  description: 'No index, data stream or index template uses this policy.',
  findings: [
    {
      id: 'unused|ilm_policy:old-retention',
      resource: { type: 'ilm_policy', id: 'old-retention' },
      related: [],
    },
  ],
};

export const noRetention: HousekeepingFindingGroup = {
  id: 'index_management.data_stream_without_retention',
  kind: 'risk',
  title: 'Data streams without retention',
  description:
    'Nothing ever deletes the data of these data streams, so they keep growing. Set a data retention with the data stream lifecycle.',
  findings: [
    {
      id: 'index_management.data_stream_without_retention|data_stream:metrics-app-default',
      resource: { type: 'data_stream', id: 'metrics-app-default' },
      related: [],
      fix: {
        description:
          'Keeps 30 days of data with the data stream lifecycle. Change the retention to what you need before running it.',
        request: 'PUT _data_stream/metrics-app-default/_lifecycle\n{\n  "data_retention": "30d"\n}',
      },
    },
  ],
};

export const response: HousekeepingFindingsResponse = {
  kinds: ['broken_reference', 'risk', 'unused'],
  groups: [missingPipelines, missingPolicies, unusedPipelines, unusedPolicies, noRetention],
  summary: { broken_reference: 4, deprecation: 0, unused: 2, risk: 1 },
  skipped: [],
  resourceTypes,
};

const emptyResponse: HousekeepingFindingsResponse = {
  kinds: ['broken_reference', 'risk', 'unused'],
  groups: [],
  summary: { broken_reference: 0, deprecation: 0, unused: 0, risk: 0 },
  skipped: [],
  resourceTypes,
};

export const loadedAt = Date.now() - 2 * 60 * 1000;

export const states: Record<string, FindingsState> = {
  loading: { isLoading: true },
  loaded: { isLoading: false, response, loadedAt },
  rerunning: { isLoading: true, response, loadedAt },
  withSkipped: {
    isLoading: false,
    loadedAt,
    response: {
      ...response,
      groups: [missingPipelines, unusedPipelines],
      summary: { broken_reference: 3, deprecation: 0, unused: 1, risk: 0 },
      skipped: [
        {
          checkId: 'index_lifecycle_management',
          checkTitle: 'Index Lifecycle Management',
          reason: 'error',
          message: 'action [cluster:admin/ilm/get] is unauthorized for user [viewer]',
        },
        {
          checkId: 'unused:ilm_policy',
          checkTitle: 'Unused lifecycle policy',
          reason: 'incomplete',
          message: 'Not checked because Index Lifecycle Management could not list their resources.',
        },
      ],
    },
  },
  allClear: { isLoading: false, loadedAt, response: emptyResponse },
  partialClear: {
    isLoading: false,
    loadedAt,
    response: {
      ...emptyResponse,
      skipped: [
        {
          checkId: 'ingest_pipelines',
          checkTitle: 'Ingest Pipelines',
          reason: 'timeout',
          message: 'Did not finish within 30000ms',
        },
      ],
    },
  },
  error: { isLoading: false, error: 'Request failed with status code 500' },
};
