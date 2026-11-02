/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutorSubActionPushParamsSchemaITSM, ExecutorParamsSchemaITSM } from './v1';

describe('ServiceNow ITSM Schema', () => {
  describe('ExecutorSubActionPushParamsSchemaITSM', () => {
    const validIncident = {
      short_description: 'Test incident',
    };

    it('validates with required fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaITSM.parse({
          incident: validIncident,
        })
      ).not.toThrow();
    });

    it('applies default values for optional fields', () => {
      const result = ExecutorSubActionPushParamsSchemaITSM.parse({
        incident: validIncident,
      });
      expect(result.incident.description).toBeNull();
      expect(result.incident.externalId).toBeNull();
      expect(result.incident.category).toBeNull();
      expect(result.incident.subcategory).toBeNull();
      expect(result.incident.severity).toBeNull();
      expect(result.incident.urgency).toBeNull();
      expect(result.incident.impact).toBeNull();
      expect(result.comments).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaITSM.parse({
          incident: {
            short_description: 'Test incident',
            description: 'Detailed description',
            externalId: 'INC001',
            category: 'Software',
            subcategory: 'Application',
            severity: '1',
            urgency: '1',
            impact: '1',
            correlation_id: 'alert-123',
            correlation_display: 'Alert #123',
            additional_fields: { custom: 'field' },
          },
          comments: [{ comment: 'Test comment', commentId: 'comment-1' }],
        })
      ).not.toThrow();
    });

    it('throws when short_description is missing', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaITSM.parse({
          incident: {},
        })
      ).toThrow();
    });

    it('validates comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaITSM.parse({
          incident: validIncident,
          comments: [
            { comment: 'Comment 1', commentId: 'id1' },
            { comment: 'Comment 2', commentId: 'id2' },
          ],
        })
      ).not.toThrow();
    });

    it('throws on invalid comments structure', () => {
      expect(() =>
        ExecutorSubActionPushParamsSchemaITSM.parse({
          incident: validIncident,
          comments: [{ comment: 'Missing commentId' }],
        })
      ).toThrow();
    });
  });

  describe('ExecutorParamsSchemaITSM', () => {
    it('validates getFields action', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'getFields',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates getIncident action', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'getIncident',
          subActionParams: {
            externalId: 'INC001',
          },
        })
      ).not.toThrow();
    });

    it('validates handshake action', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'handshake',
          subActionParams: {},
        })
      ).not.toThrow();
    });

    it('validates pushToService action', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'pushToService',
          subActionParams: {
            incident: { short_description: 'Test' },
          },
        })
      ).not.toThrow();
    });

    it('validates getChoices action', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'getChoices',
          subActionParams: {
            fields: ['severity', 'urgency'],
          },
        })
      ).not.toThrow();
    });

    it('validates closeIncident action', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'closeIncident',
          subActionParams: {
            incident: {
              externalId: 'INC001',
            },
          },
        })
      ).not.toThrow();
    });

    it('throws on invalid subAction', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subAction: 'invalidAction',
          subActionParams: {},
        })
      ).toThrow();
    });

    it('throws when subAction is missing', () => {
      expect(() =>
        ExecutorParamsSchemaITSM.parse({
          subActionParams: {},
        })
      ).toThrow();
    });
  });
});
