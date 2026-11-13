/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW,
  ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID,
  managedWorkflowDefinitions,
} from '../..';

describe('endpoint knowledge search managed workflow', () => {
  it('registers one enforced internal workflow for all consumers', () => {
    expect(
      managedWorkflowDefinitions.filter(({ id }) => id === ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID)
    ).toEqual([ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW]);
    expect(ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW).toMatchObject({
      id: 'system-security-endpoint-knowledge-search',
      billable: false,
      pluginId: 'securitySolution',
      management: { enablement: 'enforced', lifecycle: 'static', versionStrategy: 'auto' },
    });
    expect(ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW).not.toHaveProperty('visibility');
    expect(parse(ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW.yaml)).toEqual({
      version: '1',
      name: 'Elastic Defend: search integration knowledge',
      description: expect.any(String),
      enabled: true,
      triggers: [
        {
          type: 'manual',
          inputs: {
            properties: {
              query: {
                type: 'string',
                minLength: 1,
                maxLength: 1024,
                description: expect.any(String),
              },
              max: {
                type: 'integer',
                minimum: 1,
                maximum: 10,
                default: 5,
                description: expect.any(String),
              },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
      ],
      steps: [
        {
          name: 'knowledge_search',
          type: 'security.searchIntegrationKnowledge',
          with: { query: '${{ inputs.query }}', max: '${{ inputs.max }}' },
        },
      ],
    });
  });
});
