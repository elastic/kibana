/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildKibanaRequest } from './kibana_request_builder';

describe('buildKibanaRequest', () => {
  describe('Space ID handling', () => {
    describe('without space ID', () => {
      it('should build request without space prefix when spaceId is not provided', () => {
        const result = buildKibanaRequest('kibana.createCase', {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'cases',
        });

        expect(result.path).toBe('/api/cases');
        expect(result.path).not.toContain('/s/');
      });

      it('should build request without space prefix when spaceId is undefined', () => {
        const result = buildKibanaRequest(
          'kibana.createCase',
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
        const result = buildKibanaRequest(
          'kibana.createCase',
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
        const result = buildKibanaRequest(
          'kibana.createCase',
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
        const result = buildKibanaRequest(
          'kibana.createCase',
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
        const result = buildKibanaRequest(
          'kibana.getCase',
          {
            caseId: 'test-case-123',
          },
          'security-space'
        );

        expect(result.path).toBe('/s/security-space/api/cases/test-case-123');
      });
    });

    describe('with different API endpoints', () => {
      it('should add space prefix to alerting endpoints using raw API', () => {
        const result = buildKibanaRequest(
          'kibana.request',
          {
            method: 'GET',
            path: '/api/alerting/_health',
          },
          'observability'
        );

        // Raw API format should not be modified by space logic
        expect(result.path).toBe('/api/alerting/_health');
      });

      it('should add space prefix to data views endpoints using raw API', () => {
        const result = buildKibanaRequest(
          'kibana.request',
          {
            method: 'GET',
            path: '/api/data_views',
          },
          'analytics'
        );

        // Raw API format should not be modified by space logic
        expect(result.path).toBe('/api/data_views');
      });

      it('should add space prefix to alert management endpoints', () => {
        const result = buildKibanaRequest(
          'kibana.SetAlertsStatus',
          {
            status: 'acknowledged',
            ids: ['alert1', 'alert2'],
          },
          'security-prod'
        );

        expect(result.path).toBe('/s/security-prod/api/detection_engine/signals/status');
      });
    });
  });

  describe('Raw API format', () => {
    it('should handle raw API format without space modification', () => {
      const result = buildKibanaRequest(
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
      const result = buildKibanaRequest(
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
      const result = buildKibanaRequest(
        'kibana.createCase',
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
      const result = buildKibanaRequest(
        'kibana.getCase',
        {
          caseId: 'test-case-id',
          includeComments: true,
        },
        'cases-space'
      );

      expect(result.path).toBe('/s/cases-space/api/cases/test-case-id');
      expect(result.query).toBeDefined();
      expect(result.query).toHaveProperty('includeComments');
    });

    it('should handle requests with no body', () => {
      const result = buildKibanaRequest('kibana.getCase', { caseId: 'test-case' }, 'monitoring');

      expect(result.path).toBe('/s/monitoring/api/cases/test-case');
      expect(result.method).toBe('GET');
      expect(result.body).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string as space ID', () => {
      const result = buildKibanaRequest(
        'kibana.createCase',
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

    it('should handle path parameters with space prefix', () => {
      const result = buildKibanaRequest(
        'kibana.getCase',
        {
          caseId: 'case-123',
        },
        'alerting-space'
      );

      expect(result.path).toBe('/s/alerting-space/api/cases/case-123');
    });

    it('should throw error for unknown action type', () => {
      expect(() => {
        buildKibanaRequest('unknown.action.type', {}, 'some-space');
      }).toThrow('No connector definition found');
    });

    it('should support backward-compatible type aliases', () => {
      // Old type name should still work and resolve to the new connector
      const result = buildKibanaRequest(
        'kibana.createCaseDefaultSpace',
        {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'cases',
        },
        'test-space'
      );

      expect(result.path).toBe('/s/test-space/api/cases');
      expect(result.method).toBe('POST');
    });
  });

  describe('Method handling', () => {
    it('should use POST method for create operations', () => {
      const result = buildKibanaRequest(
        'kibana.createCase',
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
      const result = buildKibanaRequest('kibana.getCase', { caseId: 'test-id' }, 'test-space');

      expect(result.method).toBe('GET');
    });

    it('should use POST method for update operations', () => {
      const result = buildKibanaRequest(
        'kibana.SetAlertsStatus',
        {
          status: 'acknowledged',
          signal_ids: ['alert-1'],
        },
        'test-space'
      );

      expect(result.method).toBe('POST');
    });
  });

  describe('Meta params stripping', () => {
    it('should not include forceServerInfo, forceLocalhost, or debug in body for connector types', () => {
      const result = buildKibanaRequest(
        'kibana.createCase',
        {
          title: 'Test Case',
          description: 'Test Description',
          owner: 'cases',
          forceServerInfo: true,
          forceLocalhost: false,
          debug: true,
        },
        'test-space'
      );

      expect(result.body).toBeDefined();
      expect(result.body!.forceServerInfo).toBeUndefined();
      expect(result.body!.forceLocalhost).toBeUndefined();
      expect(result.body!.debug).toBeUndefined();
      expect(result.body!.title).toBe('Test Case');
    });

    it('should not include meta params in query for connector types', () => {
      const result = buildKibanaRequest(
        'kibana.getCase',
        {
          caseId: 'test-case-123',
          forceServerInfo: true,
          debug: true,
        },
        'default'
      );

      expect(result.query?.forceServerInfo).toBeUndefined();
      expect(result.query?.debug).toBeUndefined();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle case creation in security space', () => {
      const result = buildKibanaRequest(
        'kibana.createCase',
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

    it('should handle alert status updates in observability space', () => {
      const result = buildKibanaRequest(
        'kibana.SetAlertsStatus',
        {
          status: 'closed',
          signal_ids: ['cpu-threshold-alert-1', 'cpu-threshold-alert-2'],
          reason: 'Alert resolved after investigation',
        },
        'observability'
      );

      expect(result.method).toBe('POST');
      expect(result.path).toBe('/s/observability/api/detection_engine/signals/status');
      expect(result.body).toMatchObject({
        status: 'closed',
        signal_ids: ['cpu-threshold-alert-1', 'cpu-threshold-alert-2'],
        reason: 'Alert resolved after investigation',
      });
    });

    it('should handle case comment operations in analytics space', () => {
      const result = buildKibanaRequest(
        'kibana.addCaseComment',
        {
          caseId: 'analytics-case-1',
          comment: 'Adding analysis results to the case',
          type: 'user',
        },
        'analytics'
      );

      expect(result.method).toBe('POST');
      expect(result.path).toBe('/s/analytics/api/cases/analytics-case-1/comments');
      expect(result.body).toMatchObject({
        comment: 'Adding analysis results to the case',
        type: 'user',
      });
    });
  });
});
