/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  absoluteUrlToKibanaFooterPath,
  buildDefaultHitlApprovalEmailMessage,
  buildDefaultHitlInputEmailMessage,
  buildHitlEmailConnectorInput,
  buildHitlExecutionFooterPath,
  resolveHitlEmailSubject,
} from './build_hitl_email_notification';

describe('build_hitl_email_notification', () => {
  describe('absoluteUrlToKibanaFooterPath', () => {
    it('returns pathname and search from an absolute URL', () => {
      expect(
        absoluteUrlToKibanaFooterPath(
          'https://kibana.example/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc'
        )
      ).toBe('/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc');
    });
  });

  describe('buildHitlExecutionFooterPath', () => {
    it('omits space prefix for the default space', () => {
      expect(buildHitlExecutionFooterPath({ spaceId: 'default', executionId: 'exec-1' })).toBe(
        '/app/workflows/executions/exec-1'
      );
    });

    it('includes space prefix for non-default spaces', () => {
      expect(buildHitlExecutionFooterPath({ spaceId: 'security', executionId: 'exec-1' })).toBe(
        '/s/security/app/workflows/executions/exec-1'
      );
    });
  });

  describe('default markdown bodies', () => {
    it('builds waitForInput markdown with an Open form link', () => {
      expect(
        buildDefaultHitlInputEmailMessage({
          stepMessage: 'Please respond',
          formUrl: 'https://kibana.example/form',
        })
      ).toBe('Please respond\n\n[Open form](https://kibana.example/form)');
    });

    it('builds waitForApproval markdown with approve and reject links', () => {
      expect(
        buildDefaultHitlApprovalEmailMessage({
          message: 'Approve change?',
          approveLabel: 'Approve',
          rejectLabel: 'Decline',
          approveUrl: 'https://kibana.example/approve',
          rejectUrl: 'https://kibana.example/reject',
        })
      ).toBe(
        'Approve change?\n\n[Approve](https://kibana.example/approve)  [Decline](https://kibana.example/reject)'
      );
    });
  });

  describe('buildHitlEmailConnectorInput', () => {
    it('includes kibanaFooterLink and omits empty cc/bcc', () => {
      expect(
        buildHitlEmailConnectorInput({
          emailConfig: {
            'connector-id': 'email-1',
            to: ['a@example.com'],
          },
          subject: 'Input required',
          message: 'Body',
          footerLinkPath: '/app/workflows/executions/exec-1',
        })
      ).toEqual({
        to: ['a@example.com'],
        subject: 'Input required',
        message: 'Body',
        kibanaFooterLink: {
          path: '/app/workflows/executions/exec-1',
          text: 'View in Kibana',
        },
      });
    });
  });

  describe('resolveHitlEmailSubject', () => {
    it('uses configured subject when present', () => {
      expect(resolveHitlEmailSubject('Custom', 'input')).toBe('Custom');
    });

    it('falls back to built-in subjects', () => {
      expect(resolveHitlEmailSubject(undefined, 'input')).toBe('Input required');
      expect(resolveHitlEmailSubject(undefined, 'approval')).toBe('Approval required');
    });
  });
});
