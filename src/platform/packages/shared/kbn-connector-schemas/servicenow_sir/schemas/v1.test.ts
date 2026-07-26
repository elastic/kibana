/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutorSubActionPushParamsSchemaSIR, ExecutorParamsSchemaSIR } from './v1';

describe('ServiceNow SIR Schema', () => {
  describe('ExecutorSubActionPushParamsSchemaSIR', () => {
    const validIncident = {
      short_description: 'Security incident',
    };

    it('validates with required fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaSIR.parse({
          incident: validIncident,
        })
      ).not.toThrow();
    });

    it('applies default values for optional fields', () => {
      const result = ExecutorSubActionPushParamsSchemaSIR.parse({
        incident: validIncident,
      });
      expect(result.incident.description).toBeNull();
      expect(result.incident.externalId).toBeNull();
      expect(result.incident.dest_ip).toBeNull();
      expect(result.incident.malware_hash).toBeNull();
      expect(result.incident.malware_url).toBeNull();
      expect(result.incident.source_ip).toBeNull();
      expect(result.incident.priority).toBeNull();
      expect(result.comments).toBeNull();
    });

    it('validates with all fields as strings', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaSIR.parse({
          incident: {
            short_description: 'Security incident',
            description: 'Detailed description',
            externalId: 'SIR001',
            dest_ip: '192.168.1.1',
            malware_hash: 'd41d8cd98f00b204e9800998ecf8427e',
            malware_url: 'https://malicious.example.com',
            source_ip: '10.0.0.1',
            priority: '1',
            category: 'Malware',
            subcategory: 'Ransomware',
            correlation_id: 'alert-123',
          },
          comments: [{ comment: 'Test comment', commentId: 'comment-1' }],
        })
      ).not.toThrow();
    });

    it('validates with array fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaSIR.parse({
          incident: {
            short_description: 'Security incident',
            dest_ip: ['192.168.1.1', '192.168.1.2'],
            malware_hash: ['hash1', 'hash2'],
            malware_url: ['https://url1.com', 'https://url2.com'],
            source_ip: ['10.0.0.1', '10.0.0.2'],
          },
        })
      ).not.toThrow();
    });

    it('validates with null values for observables', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaSIR.parse({
          incident: {
            short_description: 'Test',
            dest_ip: null,
            malware_hash: null,
            malware_url: null,
            source_ip: null,
          },
        })
      ).not.toThrow();
    });

    it('throws when short_description is missing', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaSIR.parse({
          incident: {},
        })
      ).toThrow();
    });

    it('validates comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaSIR.parse({
          incident: validIncident,
          comments: [
            { comment: 'Comment 1', commentId: 'id1' },
            { comment: 'Comment 2', commentId: 'id2' },
          ],
        })
      ).not.toThrow();
    });
  });

  describe('ExecutorParamsSchemaSIR', () => {
    it('validates getFields action', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subAction: 'getFields',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates getIncident action', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subAction: 'getIncident',
          subActionParams: {
            externalId: 'SIR001',
          },
        })
      ).not.toThrow();
    });

    it('validates handshake action', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subAction: 'handshake',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates pushToService action', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subAction: 'pushToService',
          subActionParams: {
            incident: { short_description: 'Test' },
          },
        })
      ).not.toThrow();
    });

    it('validates getChoices action', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subAction: 'getChoices',
          subActionParams: {
            fields: ['priority', 'category'],
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subAction: 'invalidAction',
          subActionParams: {},
        })
      ).toThrow();
    });

    it('throws when subAction is missing', () => {
      expect(() =>
        ExecutorParamsSchemaSIR.parse({
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
