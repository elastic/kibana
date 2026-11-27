/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildFailureHtml } from './html';
import type { TestFailure } from './test_failure';

const createMockFailure = (overrides: Partial<TestFailure> = {}): TestFailure => ({
  id: 'test-id-1',
  suite: 'My Suite',
  title: 'should work',
  target: 'local',
  command: 'node scripts/playwright test',
  location: 'path/to/file.spec.ts:1:1',
  owner: ['@elastic/kibana-scout'],
  duration: 1000,
  error: { message: 'boom', stack_trace: 'stack' },
  attachments: [],
  ...overrides,
});

describe('buildFailureHtml', () => {
  it('omits the retries row when attempt is undefined (not a retry-aware run)', () => {
    const html = buildFailureHtml(createMockFailure());
    expect(html).not.toContain('Retries:');
  });

  it('omits the retries row for a first attempt (attempt 0)', () => {
    const html = buildFailureHtml(createMockFailure({ attempt: 0 }));
    expect(html).not.toContain('Retries:');
  });

  it('shows that the test failed again on retry when attempt is greater than 0', () => {
    const html = buildFailureHtml(createMockFailure({ attempt: 1 }));
    expect(html).toContain('Retries:');
    expect(html).toContain('Failed again on retry (attempt 2)');
  });

  describe('Cloud project logs', () => {
    const cloudFailure = createMockFailure({
      target: 'cloud-serverless-security_complete',
      startTime: '2026-11-21T06:52:10.000Z',
      duration: 8000,
      elasticCloud: {
        project: { id: 'cf0e5979c7e74167b6abe94e7f5bd148' },
        region: 'aws-eu-west-1',
        environment: 'qa',
      },
    });

    it('links to the logs of the QA project the test ran against', () => {
      const html = buildFailureHtml(cloudFailure);

      expect(html).toContain('<div class="section" id="cloud-project-logs">');
      expect(html).toContain(
        'project <code>cf0e5979c7e74167b6abe94e7f5bd148</code> (aws-eu-west-1), from 2026-11-21T06:47:10.000Z to 2026-11-21T06:54:18.000Z'
      );
      const links = [...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
      expect(links.map(([, , label]) => label)).toEqual(['Open in Discover']);
      const [[, href]] = links;
      expect(href).toMatch(/^https:\/\/overview\.qa\.cld\.elstc\.co\/app\/discover#\/\?_g=/);
      // the query string separator must be escaped in an HTML attribute
      expect(href).toContain('&amp;_a=');
    });

    it('is left out for local runs', () => {
      const html = buildFailureHtml(createMockFailure({ startTime: '2026-11-21T06:52:10.000Z' }));
      expect(html).not.toContain('cloud-project-logs');
    });
  });
});
