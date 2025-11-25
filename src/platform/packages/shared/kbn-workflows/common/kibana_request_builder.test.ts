/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildKibanaRequestFromAction } from './kibana_request_builder';

describe('buildKibanaRequestFromAction', () => {
  describe('Space ID handling', () => {
    describe('without space ID', () => {
      it('should build request without space prefix when spaceId is not provided', () => {
        const result = buildKibanaRequestFromAction('kibana.createCaseDefaultSpace', {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'cases',
        });

        expect(result.path).toBe('/api/cases');
        expect(result.path).not.toContain('/s/');
      });

      it('should build request without space prefix when spaceId is undefined', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.createCaseDefaultSpace',
          {
            title: 'Test Case',
            description: 'Test Description',
            owner: 'cases',
          },
          undefined
        );

        expect(result.path).toBe('/api/cases');
        expect(result.path).not.toContain('/s/');
      });
    });

    describe('with default space', () => {
      it('should not add space prefix for default space', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.createCaseDefaultSpace',
          {
            title: 'Test Case',
            description: 'Test Description',
            owner: 'cases',
          },
          'default'
        );

        expect(result.path).toBe('/api/cases');
        expect(result.path).not.toContain('/s/default');
      });
    });

    describe('with custom space', () => {
      it('should add space prefix for non-default space', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.createCaseDefaultSpace',
          {
            title: 'Test Case',
            description: 'Test Description',
            owner: 'cases',
          },
          'my-custom-space'
        );

        expect(result.path).toBe('/s/my-custom-space/api/cases');
      });

      it('should handle space IDs with special characters', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.createCaseDefaultSpace',
          {
            title: 'Test Case',
            description: 'Test Description',
            owner: 'cases',
          },
          'team-security-prod'
        );

        expect(result.path).toBe('/s/team-security-prod/api/cases');
      });

      it('should handle space prefix with path parameters', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.get_actions_connector_id',
          {
            id: 'test-connector-123',
          },
          'security-space'
        );

        expect(result.path).toBe('/s/security-space/api/actions/connector/test-connector-123');
      });
    });

    describe('with different API endpoints', () => {
      it('should add space prefix to alerting endpoints', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.getAlertingHealth',
          {},
          'observability'
        );

        expect(result.path).toBe('/s/observability/api/alerting/_health');
      });

      it('should add space prefix to data views endpoints', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.getAllDataViewsDefault',
          {},
          'analytics'
        );

        expect(result.path).toBe('/s/analytics/api/data_views');
      });

      it('should add space prefix to cases endpoints', () => {
        const result = buildKibanaRequestFromAction(
          'kibana.findCasesDefaultSpace',
          { page: 1 },
          'security-prod'
        );

        expect(result.path).toBe('/s/security-prod/api/cases/_find');
      });
    });
  });

  describe('Raw API format', () => {
    it('should handle raw API format without space modification', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.request',
        {
          method: 'POST',
          path: '/api/cases',
          body: { title: 'Test' },
        },
        'my-space'
      );

      // Raw API format should not be modified by space logic
      expect(result.method).toBe('POST');
      expect(result.path).toBe('/api/cases');
      expect(result.body).toEqual({ title: 'Test' });
    });

    it('should handle request parameter with custom headers', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.request',
        {
          request: {
            method: 'GET',
            path: '/api/status',
            headers: { 'custom-header': 'value' },
          },
        },
        'some-space'
      );

      expect(result.method).toBe('GET');
      expect(result.path).toBe('/api/status');
      expect(result.headers).toEqual({ 'custom-header': 'value' });
    });
  });

  describe('Request structure', () => {
    it('should return proper request structure with all fields', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.createCaseDefaultSpace',
        {
          title: 'Test Case',
          description: 'Description',
          owner: 'cases',
          tags: ['tag1', 'tag2'],
        },
        'test-space'
      );

      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('body');
      expect(result.method).toBe('POST');
      expect(result.path).toBe('/s/test-space/api/cases');
      expect(result.body).toMatchObject({
        title: 'Test Case',
        description: 'Description',
        owner: 'cases',
      });
    });

    it('should handle query parameters', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.findCasesDefaultSpace',
        {
          page: 1,
          perPage: 10,
          sortField: 'createdAt',
        },
        'cases-space'
      );

      expect(result.path).toBe('/s/cases-space/api/cases/_find');
      expect(result.query).toBeDefined();
      expect(result.query).toHaveProperty('page');
      expect(result.query).toHaveProperty('perPage');
    });

    it('should handle requests with no body', () => {
      const result = buildKibanaRequestFromAction('kibana.getAlertingHealth', {}, 'monitoring');

      expect(result.path).toBe('/s/monitoring/api/alerting/_health');
      expect(result.method).toBe('GET');
      expect(result.body).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string as space ID', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.createCaseDefaultSpace',
        {
          title: 'Test',
          description: 'Test',
          owner: 'cases',
        },
        ''
      );

      // Empty string should not add prefix
      expect(result.path).toBe('/api/cases');
      expect(result.path).not.toContain('/s/');
    });

    it('should handle multiple path parameters with space prefix', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.get_actions_connector_id',
        {
          id: 'connector-123',
        },
        'alerting-space'
      );

      expect(result.path).toBe('/s/alerting-space/api/actions/connector/connector-123');
    });

    it('should throw error for unknown action type', () => {
      expect(() => {
        buildKibanaRequestFromAction('unknown.action.type', {}, 'some-space');
      }).toThrow('No connector definition found');
    });
  });

  describe('Method handling', () => {
    it('should use POST method for create operations', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.createCaseDefaultSpace',
        {
          title: 'Test',
          description: 'Test',
          owner: 'cases',
        },
        'test-space'
      );

      expect(result.method).toBe('POST');
    });

    it('should use GET method for retrieval operations', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.get_actions_connector_id',
        { id: 'test-id' },
        'test-space'
      );

      expect(result.method).toBe('GET');
    });

    it('should use DELETE method for delete operations', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.delete_actions_connector_id',
        { id: 'test-id' },
        'test-space'
      );

      expect(result.method).toBe('DELETE');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle case creation in security space', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.createCaseDefaultSpace',
        {
          title: 'Security Incident',
          description: 'Suspicious activity detected',
          owner: 'securitySolution',
          tags: ['security', 'incident'],
          severity: 'high',
        },
        'security'
      );

      expect(result.method).toBe('POST');
      expect(result.path).toBe('/s/security/api/cases');
      expect(result.body).toMatchObject({
        title: 'Security Incident',
        description: 'Suspicious activity detected',
        owner: 'securitySolution',
      });
    });

    it('should handle alert rule creation in observability space', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.post_alerting_rule_id',
        {
          id: 'cpu-threshold-rule',
          name: 'CPU Threshold Alert',
          params: { threshold: 80 },
        },
        'observability'
      );

      expect(result.method).toBe('POST');
      expect(result.path).toBe('/s/observability/api/alerting/rule/cpu-threshold-rule');
      expect(result.body).toMatchObject({
        name: 'CPU Threshold Alert',
        params: { threshold: 80 },
      });
    });

    it('should handle data view operations in analytics space', () => {
      const result = buildKibanaRequestFromAction(
        'kibana.createDataViewDefaultw',
        {
          name: 'logs-*',
          title: 'Logs Index Pattern',
        },
        'analytics'
      );

      expect(result.method).toBe('POST');
      expect(result.path).toBe('/s/analytics/api/data_views/data_view');
      expect(result.body).toMatchObject({
        name: 'logs-*',
        title: 'Logs Index Pattern',
      });
    });
  });
});
