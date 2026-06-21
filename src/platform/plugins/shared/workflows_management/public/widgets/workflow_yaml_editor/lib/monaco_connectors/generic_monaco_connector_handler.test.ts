/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { GenericMonacoConnectorHandler } from './generic_monaco_connector_handler';
import { getCachedAllConnectors } from '../connectors_cache';
import type { HoverContext } from '../monaco_providers/provider_interfaces';

jest.mock('../connectors_cache', () => ({
  getCachedAllConnectors: jest.fn(),
}));

const mockGetCachedAllConnectors = getCachedAllConnectors as jest.MockedFunction<
  typeof getCachedAllConnectors
>;

const createHoverContext = (connectorType: string): HoverContext =>
  ({
    kind: 'connector',
    connectorType,
    yamlPath: ['steps', '0', 'type'],
    currentValue: connectorType,
    position: {},
    model: {},
    yamlDocument: {},
    stepContext: {
      stepName: `${connectorType.replaceAll('.', '_')}_step`,
      stepType: connectorType,
      isInWithBlock: false,
      stepNode: {},
      typeNode: {},
    },
  } as HoverContext);

describe('GenericMonacoConnectorHandler', () => {
  let handler: GenericMonacoConnectorHandler;

  beforeEach(() => {
    mockGetCachedAllConnectors.mockReturnValue([
      {
        type: 'xsoar.run',
        summary: 'Run',
        description: 'Create an XSOAR incident and optionally associate it with a playbook.',
        documentation: '/reference/connectors-kibana/xsoar-action-type.md',
        paramsSchema: z.object({}),
        outputSchema: z.object({}),
        examples: {
          params: {
            createInvestigation: 'true',
            severity: '2',
          },
          snippet: `- name: create_xsoar_incident
  type: xsoar.run
  connector-id: <connector-id>
  with:
    name: Suspicious login detected
    createInvestigation: true
    severity: 2`,
        },
      },
      {
        type: 'xsoar.getPlaybooks',
        summary: 'Get Playbooks',
        description: 'Retrieve XSOAR playbooks visible to the connector.',
        documentation: '/reference/connectors-kibana/xsoar-action-type.md',
        paramsSchema: z.object({}),
        outputSchema: z.object({}),
        examples: {
          snippet: `- name: get_xsoar_playbooks
  type: xsoar.getPlaybooks
  connector-id: <connector-id>`,
        },
      },
    ]);
    handler = new GenericMonacoConnectorHandler();
  });

  it('returns XSOAR run hover documentation', async () => {
    const result = await handler.generateHoverContent(createHoverContext('xsoar.run'));

    expect(result?.value).toContain('Create an XSOAR incident');
    expect(result?.value).toContain('createInvestigation');
    expect(result?.value).toContain('/reference/connectors-kibana/xsoar-action-type.md');
  });

  it('returns the XSOAR run example snippet', () => {
    const result = handler.getExamples('xsoar.run');

    expect(result?.snippet).toContain('type: xsoar.run');
    expect(result?.snippet).toContain('createInvestigation: true');
    expect(result?.snippet).toContain('severity: 2');
  });

  it('returns the XSOAR get playbooks example snippet', () => {
    const result = handler.getExamples('xsoar.getPlaybooks');

    expect(result?.snippet).toContain('type: xsoar.getPlaybooks');
    expect(result?.snippet).not.toContain('with:');
  });
});
