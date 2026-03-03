/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { preprocessAlertInputs } from './preprocess_alert_inputs';
import type { WorkflowsRequestHandlerContext } from '../../types';

describe('preprocessAlertInputs', () => {
  let mockEsClient: { mget: jest.Mock };
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockContext: WorkflowsRequestHandlerContext;

  const createMockRuleType = (ruleTypeId: string) => ({
    id: ruleTypeId,
    name: 'Test Rule Type',
    alerts: {
      formatAlert: jest.fn((source: Record<string, unknown>) => {
        // Add signal property if signal-mappable fields are present
        const hasSignalFields =
          source['kibana.alert.depth'] ||
          source['kibana.alert.original_time'] ||
          source['kibana.alert.reason'];
        return hasSignalFields ? { ...source, signal: {} } : source;
      }),
    },
  });

  beforeEach(() => {
    mockEsClient = {
      mget: jest.fn(),
    };

    mockLogger = loggerMock.create();

    const mockRuleTypeRegistryMap = new Map();
    mockRuleTypeRegistryMap.set('test-rule-type', createMockRuleType('test-rule-type'));
    mockRuleTypeRegistryMap.set(QUERY_RULE_TYPE_ID, createMockRuleType(QUERY_RULE_TYPE_ID));

    mockContext = {
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      }),
      alerting: Promise.resolve({
        listTypes: jest.fn(() => mockRuleTypeRegistryMap),
      }),
    } as any;
  });

  describe('when inputs are not alert trigger type', () => {
    it('should return inputs unchanged for non-alert trigger', async () => {
      const inputs = {
        event: {
          triggerType: 'manual',
          data: { some: 'data' },
        },
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      expect(result).toEqual(inputs);
      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });

    it('should return inputs unchanged when event is missing', async () => {
      const inputs = {
        otherField: 'value',
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      expect(result).toEqual(inputs);
      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });

    it('should return inputs unchanged when alertIds is empty', async () => {
      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [],
        },
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      expect(result).toEqual(inputs);
      expect(mockEsClient.mget).not.toHaveBeenCalled();
    });
  });

  describe('when inputs are alert trigger type', () => {
    const createMockAlertSource = (overrides = {}) => ({
      '@timestamp': '2024-01-01T00:00:00Z',
      'kibana.alert.rule.uuid': 'rule-uuid-123',
      'kibana.alert.rule.name': 'Test Rule',
      'kibana.alert.rule.tags': ['tag1', 'tag2'],
      'kibana.alert.rule.consumer': 'test-consumer',
      'kibana.alert.rule.producer': 'test-producer',
      'kibana.alert.rule.rule_type_id': 'test-rule-type',
      'kibana.alert.severity': 'high',
      'kibana.alert.status': 'active',
      ...overrides,
    });

    it('should preprocess alert inputs successfully', async () => {
      const alertSource1 = createMockAlertSource();
      const alertSource2 = createMockAlertSource({
        'kibana.alert.rule.name': 'Test Rule 2',
      });

      mockEsClient.mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: true,
            _id: 'alert-1',
            _index: '.alerts-test-default',
            _source: alertSource1,
          },
          {
            found: true,
            _id: 'alert-2',
            _index: '.alerts-test-default',
            _source: alertSource2,
          },
        ],
      });

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [
            { _id: 'alert-1', _index: '.alerts-test-default' },
            { _id: 'alert-2', _index: '.alerts-test-default' },
          ],
        },
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      expect(mockEsClient.mget).toHaveBeenCalledWith({
        docs: [
          { _id: 'alert-1', _index: '.alerts-test-default' },
          { _id: 'alert-2', _index: '.alerts-test-default' },
        ],
      });

      // Verify the transformed event structure
      expect(result.event).toBeDefined();
      const event = result.event as {
        alerts: unknown[];
        rule: { id: string; name: string; tags: string[] };
        spaceId: string;
      };
      expect(event.alerts).toBeDefined();
      expect(Array.isArray(event.alerts)).toBe(true);
      expect(event.alerts.length).toBe(2);
      expect(event.rule).toBeDefined();
      expect(event.rule.id).toBe('rule-uuid-123');
      expect(event.rule.name).toBe('Test Rule');
      expect(event.spaceId).toBe('default');
    });

    it('should handle alerts from multiple rules and use the first rule', async () => {
      const alertSource1 = createMockAlertSource({
        'kibana.alert.rule.uuid': 'rule-uuid-1',
        'kibana.alert.rule.name': 'Rule 1',
      });
      const alertSource2 = createMockAlertSource({
        'kibana.alert.rule.uuid': 'rule-uuid-2',
        'kibana.alert.rule.name': 'Rule 2',
      });

      mockEsClient.mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: true,
            _id: 'alert-1',
            _index: '.alerts-test-default',
            _source: alertSource1,
          },
          {
            found: true,
            _id: 'alert-2',
            _index: '.alerts-test-default',
            _source: alertSource2,
          },
        ],
      });

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [
            { _id: 'alert-1', _index: '.alerts-test-default' },
            { _id: 'alert-2', _index: '.alerts-test-default' },
          ],
        },
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Multiple rules detected')
      );
      const event = result.event as {
        alerts: unknown[];
        rule: { id: string; name: string };
      };
      expect(event.rule.id).toBe('rule-uuid-1');
      expect(event.rule.name).toBe('Rule 1');
      // All alerts should still be included
      expect(event.alerts.length).toBe(2);
    });

    it('should throw error when no alerts are found', async () => {
      mockEsClient.mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: false,
            _id: 'alert-1',
            _index: '.alerts-test-default',
          },
          {
            found: false,
            _id: 'alert-2',
            _index: '.alerts-test-default',
          },
        ],
      });

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [
            { _id: 'alert-1', _index: '.alerts-test-default' },
            { _id: 'alert-2', _index: '.alerts-test-default' },
          ],
        },
      };

      await expect(
        preprocessAlertInputs(inputs, mockContext, 'default', mockLogger)
      ).rejects.toThrow('No alerts found with the provided IDs');

      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });

    it('should throw error when alerts are missing rule information', async () => {
      const alertSourceWithoutRule = {
        '@timestamp': '2024-01-01T00:00:00Z',
        'kibana.alert.severity': 'high',
        // Missing rule fields
      };

      mockEsClient.mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: true,
            _id: 'alert-1',
            _index: '.alerts-test-default',
            _source: alertSourceWithoutRule,
          },
        ],
      });

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
        },
      };

      await expect(
        preprocessAlertInputs(inputs, mockContext, 'default', mockLogger)
      ).rejects.toThrow('Could not extract rule information from alerts');
    });

    it('should handle Elasticsearch errors', async () => {
      const esError = new Error('Elasticsearch connection failed');
      mockEsClient.mget = jest.fn().mockRejectedValue(esError);

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
        },
      };

      await expect(
        preprocessAlertInputs(inputs, mockContext, 'default', mockLogger)
      ).rejects.toThrow('Elasticsearch connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch alerts')
      );
    });

    it('should preserve other input fields when preprocessing', async () => {
      const alertSource = createMockAlertSource();

      mockEsClient.mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: true,
            _id: 'alert-1',
            _index: '.alerts-test-default',
            _source: alertSource,
          },
        ],
      });

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
        },
        otherField: 'should be preserved',
        anotherField: { nested: 'value' },
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      expect(result.otherField).toBe('should be preserved');
      expect(result.anotherField).toEqual({ nested: 'value' });
      expect(result.event).toBeDefined();
      const event = result.event as { rule: { tags: string[] } };
      expect(event.rule).toBeDefined();
    });

    it('should handle alerts with missing optional rule tags', async () => {
      const alertSourceWithTags = createMockAlertSource();
      const { 'kibana.alert.rule.tags': _, ...alertSourceWithoutTags } = alertSourceWithTags;

      mockEsClient.mget = jest.fn().mockResolvedValue({
        docs: [
          {
            found: true,
            _id: 'alert-1',
            _index: '.alerts-test-default',
            _source: alertSourceWithoutTags,
          },
        ],
      });

      const inputs = {
        event: {
          triggerType: 'alert',
          alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
        },
      };

      const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

      const event = result.event as { rule: { tags: string[] } };
      expect(event.rule.tags).toEqual([]);
    });

    describe('extractRuleFromAlert edge cases', () => {
      it('should return null when required rule fields are missing or invalid', async () => {
        const testCases = [
          {
            name: 'missing uuid',
            overrides: {},
            deleteField: 'kibana.alert.rule.uuid',
          },
          {
            name: 'missing name',
            overrides: {},
            deleteField: 'kibana.alert.rule.name',
          },
          {
            name: 'non-string uuid',
            overrides: { 'kibana.alert.rule.uuid': 12345 },
          },
          {
            name: 'null consumer',
            overrides: { 'kibana.alert.rule.consumer': null },
          },
        ];

        for (const testCase of testCases) {
          const alertSource = createMockAlertSource(testCase.overrides);
          if (testCase.deleteField) {
            delete (alertSource as Record<string, unknown>)[testCase.deleteField];
          }

          mockEsClient.mget = jest.fn().mockResolvedValue({
            docs: [
              {
                found: true,
                _id: 'alert-1',
                _index: '.alerts-test-default',
                _source: alertSource,
              },
            ],
          });

          const inputs = {
            event: {
              triggerType: 'alert',
              alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
            },
          };

          await expect(
            preprocessAlertInputs(inputs, mockContext, 'default', mockLogger)
          ).rejects.toThrow('Could not extract rule information from alerts');
        }
      });
    });

    describe('extractRulesFromAlerts edge cases', () => {
      it('should deduplicate rules with same UUID', async () => {
        const alertSource1 = createMockAlertSource({
          'kibana.alert.rule.uuid': 'rule-uuid-123',
          'kibana.alert.rule.name': 'Rule 1',
        });
        const alertSource2 = createMockAlertSource({
          'kibana.alert.rule.uuid': 'rule-uuid-123', // Same UUID
          'kibana.alert.rule.name': 'Rule 2', // Different name
        });

        mockEsClient.mget = jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _index: '.alerts-test-default',
              _source: alertSource1,
            },
            {
              found: true,
              _id: 'alert-2',
              _index: '.alerts-test-default',
              _source: alertSource2,
            },
          ],
        });

        const inputs = {
          event: {
            triggerType: 'alert',
            alertIds: [
              { _id: 'alert-1', _index: '.alerts-test-default' },
              { _id: 'alert-2', _index: '.alerts-test-default' },
            ],
          },
        };

        const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

        // Should only have one rule (deduplicated)
        const event = result.event as { rule: { id: string; name: string }; alerts: unknown[] };
        expect(event.rule.id).toBe('rule-uuid-123');
        expect(event.rule.name).toBe('Rule 1'); // First one wins
        expect(event.alerts.length).toBe(2); // But both alerts are included
        expect(mockLogger.warn).not.toHaveBeenCalled(); // No warning for single rule
      });

      it('should skip alerts with invalid rule information', async () => {
        const alertSource1 = createMockAlertSource();
        const alertSource2 = {
          '@timestamp': '2024-01-01T00:00:00Z',
          // Missing rule fields
        };

        mockEsClient.mget = jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _index: '.alerts-test-default',
              _source: alertSource1,
            },
            {
              found: true,
              _id: 'alert-2',
              _index: '.alerts-test-default',
              _source: alertSource2,
            },
          ],
        });

        const inputs = {
          event: {
            triggerType: 'alert',
            alertIds: [
              { _id: 'alert-1', _index: '.alerts-test-default' },
              { _id: 'alert-2', _index: '.alerts-test-default' },
            ],
          },
        };

        // Should still succeed with the valid alert
        const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

        const event = result.event as { rule: { id: string }; alerts: unknown[] };
        expect(event.rule.id).toBe('rule-uuid-123');
        expect(event.alerts.length).toBe(2); // Both alerts included, but only one rule extracted
      });
    });

    describe('constructSignalObject edge cases', () => {
      it('should include signal object when alert has signal-mappable fields', async () => {
        const alertSource = createMockAlertSource({
          'kibana.alert.depth': 1,
          'kibana.alert.original_time': '2024-01-01T00:00:00Z',
          'kibana.alert.reason': 'Test reason',
        });

        mockEsClient.mget = jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _index: '.alerts-test-default',
              _source: alertSource,
            },
          ],
        });

        const inputs = {
          event: {
            triggerType: 'alert',
            alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
          },
        };

        const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

        const event = result.event as { alerts: Array<{ signal?: unknown }> };
        expect(event.alerts[0]).toHaveProperty('signal');
      });
    });

    describe('fetchAlerts edge cases', () => {
      it('should use expandFlattenedAlert when formatAlert is not available', async () => {
        // Create a context where the rule type registry doesn't have a formatAlert function
        const mockRuleTypeRegistryWithoutFormat = new Map();
        mockRuleTypeRegistryWithoutFormat.set('unknown-rule-type', {
          id: 'unknown-rule-type',
          name: 'Unknown Rule Type',
          // No alerts.formatAlert function
        });

        const contextWithoutFormat = {
          core: Promise.resolve({
            elasticsearch: {
              client: {
                asCurrentUser: mockEsClient,
              },
            },
          }),
          alerting: Promise.resolve({
            listTypes: jest.fn(() => mockRuleTypeRegistryWithoutFormat),
          }),
        } as any;

        // Alert with flat ECS-style keys
        const alertSource = {
          '@timestamp': '2024-01-01T00:00:00Z',
          'kibana.alert.rule.uuid': 'rule-uuid-123',
          'kibana.alert.rule.name': 'Test Rule',
          'kibana.alert.rule.tags': ['tag1'],
          'kibana.alert.rule.consumer': 'test-consumer',
          'kibana.alert.rule.producer': 'test-producer',
          'kibana.alert.rule.rule_type_id': 'unknown-rule-type',
          'kibana.alert.status': 'active',
        };

        mockEsClient.mget = jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _index: '.alerts-test-default',
              _source: alertSource,
            },
          ],
        });

        const inputs = {
          event: {
            triggerType: 'alert',
            alertIds: [{ _id: 'alert-1', _index: '.alerts-test-default' }],
          },
        };

        const result = await preprocessAlertInputs(
          inputs,
          contextWithoutFormat,
          'default',
          mockLogger
        );

        // Verify the alert was expanded from flat ECS keys to nested objects
        const event = result.event as { alerts: Array<Record<string, unknown>> };
        expect(event.alerts.length).toBe(1);
        const alert = event.alerts[0];

        // Check that flat keys were expanded to nested structure
        expect(alert).toHaveProperty('kibana');
        const kibana = alert.kibana as { alert: { status: string; rule: { name: string } } };
        expect(kibana.alert.status).toBe('active');
        expect(kibana.alert.rule.name).toBe('Test Rule');
      });

      it('should handle mixed found/not found documents', async () => {
        const alertSource = createMockAlertSource();

        mockEsClient.mget = jest.fn().mockResolvedValue({
          docs: [
            {
              found: true,
              _id: 'alert-1',
              _index: '.alerts-test-default',
              _source: alertSource,
            },
            {
              found: false,
              _id: 'alert-2',
              _index: '.alerts-test-default',
            },
          ],
        });

        const inputs = {
          event: {
            triggerType: 'alert',
            alertIds: [
              { _id: 'alert-1', _index: '.alerts-test-default' },
              { _id: 'alert-2', _index: '.alerts-test-default' },
            ],
          },
        };

        const result = await preprocessAlertInputs(inputs, mockContext, 'default', mockLogger);

        const event = result.event as { alerts: unknown[] };
        expect(event.alerts.length).toBe(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Alert not found: alert-2 in index .alerts-test-default'
        );
      });
    });
  });
});
