/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutorSubActionAddEventParamsSchema, ExecutorParamsSchemaITOM } from './v1';

describe('ServiceNow ITOM Schema', () => {
  describe('ExecutorSubActionAddEventParamsSchema', () => {
    it('validates empty object', () => {
      expect(() => ExecutorSubActionAddEventParamsSchema.parse({})).not.toThrow();
    });

    it('applies default values', () => {
      const result = ExecutorSubActionAddEventParamsSchema.parse({});
      expect(result.source).toBeNull();
      expect(result.event_class).toBeNull();
      expect(result.resource).toBeNull();
      expect(result.node).toBeNull();
      expect(result.metric_name).toBeNull();
      expect(result.type).toBeNull();
      expect(result.severity).toBeNull();
      expect(result.description).toBeNull();
      expect(result.additional_info).toBeNull();
      expect(result.message_key).toBeDefined();
      expect(result.time_of_event).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionAddEventParamsSchema.parse({
          source: 'Kibana',
          event_class: 'Alert',
          resource: 'CPU',
          node: 'server-01',
          metric_name: 'cpu_usage',
          type: 'threshold',
          severity: 'critical',
          description: 'CPU usage exceeded threshold',
          additional_info: '{"threshold": 90}',
          message_key: 'custom-key-123',
          time_of_event: '2023-01-01T00:00:00Z',
        })
      ).not.toThrow();
    });

    it('accepts null for all optional fields', () => {
      expect(() =>
        ExecutorSubActionAddEventParamsSchema.parse({
          source: null,
          event_class: null,
          resource: null,
          node: null,
          metric_name: null,
          type: null,
          severity: null,
          description: null,
          additional_info: null,
          message_key: null,
          time_of_event: null,
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ExecutorSubActionAddEventParamsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ExecutorParamsSchemaITOM', () => {
    it('validates addEvent action', () => {
      expect(() =>
        ExecutorParamsSchemaITOM.parse({
          subAction: 'addEvent',
          subActionParams: {
            source: 'Kibana',
            severity: 'critical',
          },
        })
      ).not.toThrow();
    });

    it('validates addEvent action with empty params', () => {
      expect(() =>
        ExecutorParamsSchemaITOM.parse({
          subAction: 'addEvent',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates getChoices action', () => {
      expect(() =>
        ExecutorParamsSchemaITOM.parse({
          subAction: 'getChoices',
          subActionParams: {
            fields: ['severity', 'priority'],
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        ExecutorParamsSchemaITOM.parse({
          subAction: 'invalidAction',
          subActionParams: {},
        })
      ).toThrow();
    });

    it('throws when subAction is missing', () => {
      expect(() =>
        ExecutorParamsSchemaITOM.parse({
          subActionParams: {},
        })
      ).toThrow();
    });

    it('throws when subActionParams is missing', () => {
      expect(() =>
        ExecutorParamsSchemaITOM.parse({
          subAction: 'addEvent',
        })
      ).toThrow();
    });
  });
});
