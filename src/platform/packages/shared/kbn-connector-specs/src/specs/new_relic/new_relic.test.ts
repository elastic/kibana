/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { NewRelic } from './new_relic';
import {
  NewRelicCreateDeploymentMarkerInputSchema,
  NewRelicUpdateMutingRuleInputSchema,
} from './types';

describe('NewRelic', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { region: 'us', accountId: '123' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const AI_ISSUES_HEADERS = { 'nerd-graph-unsafe-experimental-opt-in': 'AiIssues' };
  const US_ENDPOINT = 'https://api.newrelic.com/graphql';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(NewRelic).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.new_relic');
    expect(spec).toBe(NewRelic);
    expect(spec?.actions.acknowledgeIssue).toBeDefined();
    expect(spec?.actions.acknowledgeIssue.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(NewRelic.metadata.id).toBe('.new_relic');
    expect(NewRelic.metadata.displayName).toBe('New Relic');
    expect(NewRelic.metadata.minimumLicense).toBe('enterprise');
  });

  it('should support api_key_header auth', () => {
    const types = (NewRelic.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('api_key_header');
  });

  describe('config schema', () => {
    // accountId is stored as a regex-validated string (not z.number()) because the
    // connector config form-generator has no widget for numeric Zod schemas.
    it('should accept a numeric-string accountId', () => {
      if (!NewRelic.schema) throw new Error('Config schema not defined');
      const result = NewRelic.schema.safeParse({ accountId: '8342677', region: 'us' });
      expect(result.success).toBe(true);
    });

    it('should reject a non-numeric accountId', () => {
      if (!NewRelic.schema) throw new Error('Config schema not defined');
      const result = NewRelic.schema.safeParse({ accountId: 'abc123', region: 'us' });
      expect(result.success).toBe(false);
    });

    it('should reject a missing accountId', () => {
      if (!NewRelic.schema) throw new Error('Config schema not defined');
      const result = NewRelic.schema.safeParse({ region: 'us' });
      expect(result.success).toBe(false);
    });

    it('handler should throw a clear error when accountId is missing from config', async () => {
      const noAccountContext = {
        ...mockContext,
        config: { region: 'us' },
      } as unknown as ActionContext;

      await expect(
        NewRelic.actions.acknowledgeIssue.handler(noAccountContext, { issueId: 'i1' })
      ).rejects.toThrow(
        'New Relic connector is missing the required accountId configuration field.'
      );
    });
  });

  describe('region endpoint resolution', () => {
    it('uses the EU endpoint when region is eu', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { aiIssuesAckIssue: { error: null, result: { issueId: 'i1' } } } },
      });
      const euContext = {
        ...mockContext,
        config: { region: 'eu', accountId: '123' },
      } as unknown as ActionContext;

      await NewRelic.actions.acknowledgeIssue.handler(euContext, {
        issueId: 'i1',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.eu.newrelic.com/graphql',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('uses the JP endpoint when region is jp', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { aiIssuesAckIssue: { error: null, result: { issueId: 'i1' } } } },
      });
      const jpContext = {
        ...mockContext,
        config: { region: 'jp', accountId: '123' },
      } as unknown as ActionContext;

      await NewRelic.actions.acknowledgeIssue.handler(jpContext, {
        issueId: 'i1',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.jp.newrelic.com/graphql',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('acknowledgeIssue action', () => {
    it('should ack an issue and return the result', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            aiIssuesAckIssue: {
              error: null,
              result: { action: 'ACK', accountId: 123, issueId: 'i1' },
            },
          },
        },
      });

      const result = await NewRelic.actions.acknowledgeIssue.handler(mockContext, {
        issueId: 'i1',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({ variables: { accountId: 123, issueId: 'i1' } }),
        { headers: AI_ISSUES_HEADERS }
      );
      expect(result).toEqual({ action: 'ACK', accountId: 123, issueId: 'i1' });
    });

    it('should throw when the mutation returns a GraphQL-level error field', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { aiIssuesAckIssue: { error: 'issue not found', result: null } } },
      });

      await expect(
        NewRelic.actions.acknowledgeIssue.handler(mockContext, { issueId: 'bad' })
      ).rejects.toThrow('issue not found');
    });

    it('should throw a formatted error when the request fails', async () => {
      mockClient.post.mockRejectedValue({
        response: { status: 403, data: { error: { title: 'Forbidden' } } },
        message: 'Request failed',
      });

      await expect(
        NewRelic.actions.acknowledgeIssue.handler(mockContext, { issueId: 'i1' })
      ).rejects.toThrow('New Relic acknowledgeIssue failed (status 403): Forbidden');
    });

    it('should throw when the GraphQL response contains top-level errors', async () => {
      mockClient.post.mockResolvedValue({
        data: { errors: [{ message: 'Unauthorized' }] },
      });

      await expect(
        NewRelic.actions.acknowledgeIssue.handler(mockContext, { issueId: 'i1' })
      ).rejects.toThrow('New Relic acknowledgeIssue failed: Unauthorized');
    });
  });

  describe('unacknowledgeIssue action', () => {
    it('should unack an issue', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { aiIssuesUnackIssue: { error: null, result: { issueId: 'i1' } } } },
      });

      const result = await NewRelic.actions.unacknowledgeIssue.handler(mockContext, {
        issueId: 'i1',
      });

      expect(result).toEqual({ issueId: 'i1' });
    });
  });

  describe('resolveIssue action', () => {
    it('should resolve an issue', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            aiIssuesResolveIssue: { error: null, result: { action: 'RESOLVE', issueId: 'i1' } },
          },
        },
      });

      const result = await NewRelic.actions.resolveIssue.handler(mockContext, {
        issueId: 'i1',
      });

      expect(result).toEqual({ action: 'RESOLVE', issueId: 'i1' });
    });
  });

  describe('listIssues action', () => {
    it('should list issues with filters and a time window', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            actor: {
              account: {
                aiIssues: {
                  issues: { issues: [{ issueId: 'i1', priority: 'CRITICAL' }], nextCursor: null },
                },
              },
            },
          },
        },
      });

      const now = Date.parse('2024-01-02T00:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const result = await NewRelic.actions.listIssues.handler(mockContext, {
        states: ['ACTIVATED'],
        priority: ['CRITICAL'],
        since: '2024-01-01T00:00:00Z',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            accountId: 123,
            filter: { states: ['ACTIVATED'], priority: ['CRITICAL'] },
            timeWindow: { startTime: Date.parse('2024-01-01T00:00:00Z'), endTime: now },
          }),
        }),
        { headers: AI_ISSUES_HEADERS }
      );
      expect(result).toEqual({
        issues: [{ issueId: 'i1', priority: 'CRITICAL' }],
        nextCursor: null,
      });

      jest.useRealTimers();
    });

    it('should default a missing since to 24h before a provided until', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: { actor: { account: { aiIssues: { issues: { issues: [], nextCursor: null } } } } },
        },
      });

      const until = '2024-01-02T00:00:00Z';
      await NewRelic.actions.listIssues.handler(mockContext, { until });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            timeWindow: {
              startTime: Date.parse(until) - 24 * 60 * 60 * 1000,
              endTime: Date.parse(until),
            },
          }),
        }),
        expect.any(Object)
      );
    });

    it('should list issues with no filters', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: { actor: { account: { aiIssues: { issues: { issues: [], nextCursor: null } } } } },
        },
      });

      await NewRelic.actions.listIssues.handler(mockContext, {});

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({ filter: undefined, timeWindow: undefined }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('listIncidents action', () => {
    it('should list incidents scoped to an issue filter', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            actor: {
              account: {
                aiIssues: { incidents: { incidents: [{ incidentId: 'inc1' }], nextCursor: null } },
              },
            },
          },
        },
      });

      const result = await NewRelic.actions.listIncidents.handler(mockContext, {
        entityGuids: ['guid1'],
      });

      expect(result).toEqual({ incidents: [{ incidentId: 'inc1' }], nextCursor: null });
    });
  });

  describe('muting rule actions', () => {
    it('createMutingRule should send name/description/condition', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { alertsMutingRuleCreate: { id: 'mr1', name: 'Deploy window' } } },
      });

      const result = await NewRelic.actions.createMutingRule.handler(mockContext, {
        name: 'Deploy window',
        enabled: true,
        condition: {
          operator: 'AND',
          conditions: [{ attribute: 'policyId', operator: 'EQUALS', values: ['789'] }],
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            accountId: 123,
            rule: expect.objectContaining({ name: 'Deploy window', enabled: true }),
          }),
        }),
        { headers: undefined }
      );
      expect(result).toEqual({ id: 'mr1', name: 'Deploy window' });
    });

    it('updateMutingRule should only send provided fields', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { alertsMutingRuleUpdate: { id: 'mr1', enabled: false } } },
      });

      await NewRelic.actions.updateMutingRule.handler(mockContext, {
        mutingRuleId: 'mr1',
        enabled: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: { accountId: 123, id: 'mr1', rule: { enabled: false } },
        }),
        expect.any(Object)
      );
    });

    it('should reject NewRelicUpdateMutingRuleInputSchema with no fields to update', () => {
      const result = NewRelicUpdateMutingRuleInputSchema.safeParse({
        mutingRuleId: 'mr1',
      });
      expect(result.success).toBe(false);
    });

    it('deleteMutingRule should delete by id', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { alertsMutingRuleDelete: { id: 'mr1' } } },
      });

      const result = await NewRelic.actions.deleteMutingRule.handler(mockContext, {
        mutingRuleId: 'mr1',
      });

      expect(result).toEqual({ id: 'mr1' });
    });

    it('listMutingRules should return the rules array', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: { actor: { account: { alerts: { mutingRules: [{ id: 'mr1' }, { id: 'mr2' }] } } } },
        },
      });

      const result = await NewRelic.actions.listMutingRules.handler(mockContext, {});

      expect(result).toEqual({ mutingRules: [{ id: 'mr1' }, { id: 'mr2' }] });
    });
  });

  describe('runNrqlQuery action', () => {
    it('should run the query and return results', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { actor: { account: { nrql: { results: [{ count: 42 }] } } } } },
      });

      const result = await NewRelic.actions.runNrqlQuery.handler(mockContext, {
        nrql: 'SELECT count(*) FROM Transaction SINCE 1 HOUR AGO',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: {
            accountId: 123,
            nrql: 'SELECT count(*) FROM Transaction SINCE 1 HOUR AGO',
            timeout: 70,
          },
        }),
        { headers: undefined }
      );
      expect(result).toEqual({ results: [{ count: 42 }] });
    });
  });

  describe('createDeploymentMarker action', () => {
    it('should record a change event for the entity', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            changeTrackingCreateEvent: {
              changeTrackingEvent: { changeTrackingId: 'ct1' },
              messages: [],
            },
          },
        },
      });

      const result = await NewRelic.actions.createDeploymentMarker.handler(mockContext, {
        entityGuid: 'guid1',
        version: '1.4.2',
        description: 'Release 1.4.2',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            event: expect.objectContaining({
              entitySearch: { query: "id = 'guid1'" },
              categoryAndTypeData: {
                kind: { category: 'deployment', type: 'Basic' },
                categoryFields: { deployment: { version: '1.4.2' } },
              },
            }),
          }),
        }),
        expect.any(Object)
      );
      expect(result).toEqual({ changeTrackingEvent: { changeTrackingId: 'ct1' }, messages: [] });
    });

    it('should forward a provided deploymentType as the kind.type and omit it from categoryFields', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            changeTrackingCreateEvent: {
              changeTrackingEvent: { changeTrackingId: 'ct2' },
              messages: [],
            },
          },
        },
      });

      await NewRelic.actions.createDeploymentMarker.handler(mockContext, {
        entityGuid: 'guid1',
        version: '2.0.0',
        deploymentType: 'Canary',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            event: expect.objectContaining({
              categoryAndTypeData: {
                kind: { category: 'deployment', type: 'Canary' },
                categoryFields: { deployment: { version: '2.0.0' } },
              },
            }),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should reject an entityGuid containing a quote (query injection attempt)', () => {
      const result = NewRelicCreateDeploymentMarkerInputSchema.safeParse({
        entityGuid: "guid1' OR name LIKE '%",
        version: '1.4.2',
      });
      expect(result.success).toBe(false);
    });

    it('should reject a missing version (required by New Relic deployment markers)', () => {
      const result = NewRelicCreateDeploymentMarkerInputSchema.safeParse({
        entityGuid: 'guid1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('inaccessible accountId', () => {
    it('should throw a clear error when NerdGraph returns a null account', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { actor: { account: null } } },
      });

      await expect(NewRelic.actions.listIssues.handler(mockContext, {})).rejects.toThrow(
        'New Relic listIssues failed: account 123 not found or not accessible'
      );
    });
  });

  describe('listAlertPolicies action', () => {
    it('should list policies with a name filter', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            actor: {
              account: {
                alerts: { policiesSearch: { policies: [{ id: 'p1' }], nextCursor: null } },
              },
            },
          },
        },
      });

      const result = await NewRelic.actions.listAlertPolicies.handler(mockContext, {
        nameFilter: 'prod',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({ searchCriteria: { nameLike: 'prod' } }),
        }),
        expect.any(Object)
      );
      expect(result).toEqual({ policies: [{ id: 'p1' }], nextCursor: null });
    });
  });

  describe('listNrqlConditions action', () => {
    it('should list conditions scoped to a policy', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            actor: {
              account: { alerts: { nrqlConditionsSearch: { nrqlConditions: [{ id: 'c1' }] } } },
            },
          },
        },
      });

      const result = await NewRelic.actions.listNrqlConditions.handler(mockContext, {
        policyId: 'p1',
      });

      expect(result).toEqual({ nrqlConditions: [{ id: 'c1' }] });
    });
  });

  describe('createAlertPolicy action', () => {
    it('should create a policy with a default incident preference', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { alertsPolicyCreate: { id: 'p1', name: 'My Policy' } } },
      });

      const result = await NewRelic.actions.createAlertPolicy.handler(mockContext, {
        name: 'My Policy',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            policy: { name: 'My Policy', incidentPreference: 'PER_POLICY' },
          }),
        }),
        expect.any(Object)
      );
      expect(result).toEqual({ id: 'p1', name: 'My Policy' });
    });
  });

  describe('createNrqlCondition action', () => {
    it('should create a static condition with terms', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { alertsNrqlConditionStaticCreate: { id: 'c1', name: 'High errors' } } },
      });

      const result = await NewRelic.actions.createNrqlCondition.handler(mockContext, {
        policyId: 'p1',
        name: 'High errors',
        nrql: 'SELECT count(*) FROM TransactionError',
        thresholdOperator: 'ABOVE',
        thresholdValue: 10,
        thresholdDurationSeconds: 300,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        US_ENDPOINT,
        expect.objectContaining({
          variables: expect.objectContaining({
            accountId: 123,
            policyId: 'p1',
            condition: expect.objectContaining({
              name: 'High errors',
              terms: [
                {
                  operator: 'ABOVE',
                  threshold: 10,
                  thresholdDuration: 300,
                  thresholdOccurrences: 'ALL',
                  priority: 'CRITICAL',
                },
              ],
            }),
          }),
        }),
        expect.any(Object)
      );
      expect(result).toEqual({ id: 'c1', name: 'High errors' });
    });
  });

  describe('test handler', () => {
    it('should succeed and report the connected user', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { actor: { user: { name: 'Jane Doe', email: 'jane@example.com' } } } },
      });

      const result = await NewRelic.test.handler(mockContext);

      expect(result).toEqual({
        message: 'Connected to New Relic NerdGraph as Jane Doe (jane@example.com).',
      });
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.post.mockRejectedValue({
        response: { status: 401, data: { error: { title: 'Invalid API key' } } },
        message: 'Request failed',
      });

      if (!NewRelic.test) throw new Error('Test handler not defined');
      await expect(NewRelic.test.handler(mockContext)).rejects.toThrow(
        'New Relic test failed (status 401): Invalid API key'
      );
    });
  });
});
