/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { default as MarkdownIt } from 'markdown-it';
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
          'https://kibana.example/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc',
          'https://kibana.example'
        )
      ).toBe('/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc');
    });

    it('strips the server base path that publicBaseUrl already includes', () => {
      expect(
        absoluteUrlToKibanaFooterPath(
          'https://kibana.example/kibana/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc',
          'https://kibana.example/kibana'
        )
      ).toBe('/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc');
    });
  });

  describe('buildHitlExecutionFooterPath', () => {
    it('omits space prefix for the default space', () => {
      expect(
        buildHitlExecutionFooterPath({
          spaceId: 'default',
          workflowId: 'workflow-1',
          executionId: 'exec-1',
        })
      ).toBe('/app/workflows/workflow-1?executionId=exec-1&tab=executions');
    });

    it('includes space prefix for non-default spaces', () => {
      expect(
        buildHitlExecutionFooterPath({
          spaceId: 'security',
          workflowId: 'workflow-1',
          executionId: 'exec-1',
        })
      ).toBe('/s/security/app/workflows/workflow-1?executionId=exec-1&tab=executions');
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

    it('keeps step text and labels from adding a link beside the ones we generate', () => {
      expect(
        buildDefaultHitlInputEmailMessage({
          stepMessage: 'See [click](https://evil.example)',
          formUrl: 'https://kibana.example/form',
        })
      ).toBe(
        'See \\[click\\](https:\u2060//evil.example)\n\n[Open form](https://kibana.example/form)'
      );
      expect(
        buildDefaultHitlApprovalEmailMessage({
          message: 'Approve?',
          approveLabel: 'Approve](https://evil.example)',
          rejectLabel: 'Decline',
          approveUrl: 'https://kibana.example/approve',
          rejectUrl: 'https://kibana.example/reject',
        })
      ).toBe(
        'Approve?\n\n[Approve\\](https:\u2060//evil.example)](https://kibana.example/approve)  [Decline](https://kibana.example/reject)'
      );
    });

    it('keeps a newline in an approval label inside the generated link', () => {
      expect(
        buildDefaultHitlApprovalEmailMessage({
          message: 'Line one\nhttps://elastic.co',
          approveLabel: 'Approve\nhttps://evil.example',
          rejectLabel: 'Decline\r\nnow',
          approveUrl: 'https://kibana.example/approve',
          rejectUrl: 'https://kibana.example/reject',
        })
      ).toBe(
        'Line one\nhttps:\u2060//elastic.co\n\n[Approve https:\u2060//evil.example](https://kibana.example/approve)  [Decline now](https://kibana.example/reject)'
      );
    });

    it('leaves a path and a plain angle bracket unchanged while blocking scheme autolinks', () => {
      const markdown = new MarkdownIt({ linkify: true });
      const source = buildDefaultHitlApprovalEmailMessage({
        message: 'C:\\temp and a < b <https://evil.example> <mailto:a@b.co>',
        approveLabel: 'Approve\\',
        rejectLabel: 'Decline',
        approveUrl: 'https://kibana.example/approve',
        rejectUrl: 'https://kibana.example/reject',
      });

      expect(source).toContain(
        'C:\\temp and a < b \\<https:\u2060//evil.example> \\<mailto:a@b.co>'
      );
      expect(source).toContain('[Approve\\\\](https://kibana.example/approve)');
      expect(
        [...markdown.render(source).matchAll(/href="([^"]*)"/g)].map((match) => match[1])
      ).toEqual(['https://kibana.example/approve', 'https://kibana.example/reject']);
    });

    it('does not let a backslash or a protocol-relative URL add a link', () => {
      const markdown = new MarkdownIt({ linkify: true });
      const hrefs = (message: string) => {
        const source = buildDefaultHitlApprovalEmailMessage({
          message,
          approveLabel: 'Approve',
          rejectLabel: 'Decline',
          approveUrl: 'https://kibana.example/approve',
          rejectUrl: 'https://kibana.example/reject',
        });
        return [...markdown.render(source).matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
      };

      expect(hrefs('\\[Approve\\](//evil.example)')).toEqual([
        'https://kibana.example/approve',
        'https://kibana.example/reject',
      ]);
      expect(hrefs('\\\\[Approve](//evil.example)')).toEqual([
        'https://kibana.example/approve',
        'https://kibana.example/reject',
      ]);
      expect(hrefs('[Approve](//evil.example)')).toEqual([
        'https://kibana.example/approve',
        'https://kibana.example/reject',
      ]);
    });

    it('keeps both resume links when step text opens a code fence', () => {
      const markdown = new MarkdownIt({ linkify: true });
      const hrefs = (source: string) =>
        [...markdown.render(source).matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

      for (const fence of ['```', '~~~']) {
        const source = buildDefaultHitlApprovalEmailMessage({
          message: `Please review\n${fence}`,
          approveLabel: 'Approve',
          rejectLabel: 'Decline',
          approveUrl: 'https://kibana.example/approve',
          rejectUrl: 'https://kibana.example/reject',
        });

        expect(markdown.render(source)).not.toContain('<pre');
        expect(hrefs(source)).toEqual([
          'https://kibana.example/approve',
          'https://kibana.example/reject',
        ]);
      }
    });

    it('keeps both resume links when both labels end in a backtick', () => {
      const markdown = new MarkdownIt({ linkify: true });
      const source = buildDefaultHitlApprovalEmailMessage({
        message: 'Approve?',
        approveLabel: 'Approve`',
        rejectLabel: 'Decline`',
        approveUrl: 'https://kibana.example/approve',
        rejectUrl: 'https://kibana.example/reject',
      });

      expect(markdown.render(source)).not.toContain('<code');
      expect(
        [...markdown.render(source).matchAll(/href="([^"]*)"/g)].map((match) => match[1])
      ).toEqual(['https://kibana.example/approve', 'https://kibana.example/reject']);
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
