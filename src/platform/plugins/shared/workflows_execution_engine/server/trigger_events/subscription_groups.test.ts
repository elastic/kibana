/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as evalKql from '@kbn/eval-kql';
import { ALL_CONNECTOR_IDS, type WorkflowDetailDto } from '@kbn/workflows';
import { groupSubscribedWorkflows, matchSubscriptionGroups } from './subscription_groups';

const workflow = (
  id: string,
  triggers: Array<{ type: string; 'connector-id'?: string; on?: { condition?: string } }>
): WorkflowDetailDto => ({
  id,
  name: id,
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'test',
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastUpdatedBy: 'test',
  definition: { triggers, steps: [] } as unknown as WorkflowDetailDto['definition'],
  yaml: '',
  valid: true,
});

describe('subscription groups', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('groups workflows that share a condition and evaluates that condition once', () => {
    const evaluate = jest.spyOn(evalKql, 'evaluateKql');
    const groups = groupSubscribedWorkflows(
      [
        workflow('1', [{ type: 'alert.fired', on: { condition: 'event.host.name: "web"' } }]),
        workflow('2', [{ type: 'alert.fired', on: { condition: 'event.host.name: "web"' } }]),
        workflow('3', [{ type: 'alert.fired', on: { condition: 'event.host.name: "db"' } }]),
      ],
      'alert.fired',
      false
    );

    expect(groups).toEqual([
      { condition: 'event.host.name: "web"', workflowIds: ['1', '2'] },
      { condition: 'event.host.name: "db"', workflowIds: ['3'] },
    ]);

    const result = matchSubscriptionGroups({
      groups,
      triggerId: 'alert.fired',
      event: { host: { name: 'web' } },
      requiresConnectorId: false,
    });

    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(result.matchedIds).toEqual(['1', '2']);
    expect(result.stats).toEqual(
      expect.objectContaining({
        subscribedCount: 3,
        matchedCount: 2,
        kqlFalseCount: 1,
      })
    );
  });

  it('matches an empty condition without evaluating KQL', () => {
    const evaluate = jest.spyOn(evalKql, 'evaluateKql');
    const groups = groupSubscribedWorkflows(
      [workflow('1', [{ type: 'cases.updated' }])],
      'cases.updated',
      false
    );

    const result = matchSubscriptionGroups({
      groups,
      triggerId: 'cases.updated',
      event: {},
      requiresConnectorId: false,
    });

    expect(evaluate).not.toHaveBeenCalled();
    expect(result.matchedIds).toEqual(['1']);
  });

  it('uses the exact connector block and ignores the wildcard block on that workflow', () => {
    const groups = groupSubscribedWorkflows(
      [
        workflow('exact-and-wildcard', [
          {
            type: 'inbound.received',
            'connector-id': 'webhook-1',
            on: { condition: 'event.host.name: "no"' },
          },
          {
            type: 'inbound.received',
            'connector-id': ALL_CONNECTOR_IDS,
            on: { condition: 'event.host.name: "yes"' },
          },
        ]),
        workflow('wildcard-only', [
          {
            type: 'inbound.received',
            'connector-id': ALL_CONNECTOR_IDS,
            on: { condition: 'event.host.name: "yes"' },
          },
        ]),
      ],
      'inbound.received',
      true
    );

    const result = matchSubscriptionGroups({
      groups,
      triggerId: 'inbound.received',
      event: { connectorId: 'webhook-1', host: { name: 'yes' } },
      requiresConnectorId: true,
    });

    expect(result.matchedIds).toEqual(['wildcard-only']);
    expect(result.stats.kqlFalseCount).toBe(1);
    expect(result.stats.connectorIdMismatchCount).toBe(0);
  });
});
