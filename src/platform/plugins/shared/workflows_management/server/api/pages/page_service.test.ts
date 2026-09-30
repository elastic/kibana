/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { getPageSubmitter, parsePageSubmission, resolvePage } from './page_service';
import { ExternalResumeError } from '../external_resume/external_resume_error';

const PAGE_ID = '7f3c2a1e-0000-4000-8000-000000000001';

const workflowWithPage = (pageId: string, overrides: Partial<WorkflowDetailDto> = {}) =>
  ({
    id: `workflow-for-${pageId}`,
    enabled: true,
    valid: true,
    definition: {
      triggers: [
        { type: 'manual' },
        {
          type: 'page',
          'page-id': pageId,
          title: 'Report an incident',
          inputs: { type: 'object', properties: { summary: { type: 'string' } } },
        },
      ],
    },
    ...overrides,
  } as unknown as WorkflowDetailDto);

describe('resolvePage', () => {
  it('finds the enabled workflow whose page trigger has the page-id', async () => {
    const finder = jest
      .fn()
      .mockResolvedValue([workflowWithPage('other'), workflowWithPage(PAGE_ID)]);

    const page = await resolvePage(finder, { pageId: PAGE_ID, spaceId: 'default' });

    expect(finder).toHaveBeenCalledWith('page', 'default');
    expect(page.workflow.id).toBe(`workflow-for-${PAGE_ID}`);
    expect(page.trigger.title).toBe('Report an incident');
  });

  it('returns a non-exposed 404 when no enabled workflow has the page-id', async () => {
    const finder = jest.fn().mockResolvedValue([workflowWithPage('other')]);

    await expect(resolvePage(finder, { pageId: PAGE_ID, spaceId: 'default' })).rejects.toEqual(
      expect.objectContaining({ statusCode: 404, expose: false })
    );
  });

  it('skips a workflow whose definition is invalid', async () => {
    const finder = jest
      .fn()
      .mockResolvedValue([workflowWithPage(PAGE_ID, { valid: false, definition: null })]);

    await expect(
      resolvePage(finder, { pageId: PAGE_ID, spaceId: 'default' })
    ).rejects.toBeInstanceOf(ExternalResumeError);
  });
});

describe('parsePageSubmission', () => {
  const inputsSchema = {
    type: 'object' as const,
    properties: { summary: { type: 'string' as const } },
    required: ['summary'],
  };

  it('accepts a submission that matches the schema', () => {
    expect(parsePageSubmission({ summary: 'disk full' }, inputsSchema)).toEqual({
      summary: 'disk full',
    });
  });

  it('rejects a submission missing a required field', () => {
    expect(() => parsePageSubmission({}, inputsSchema)).toThrow(ExternalResumeError);
  });
});

describe('getPageSubmitter', () => {
  it('prefers the first x-forwarded-for entry over the socket address', () => {
    const submitter = getPageSubmitter(
      { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'curl/8' },
      '10.0.0.1'
    );
    expect(submitter.ip).toBe('203.0.113.7');
    expect(submitter.userAgent).toBe('curl/8');
  });

  it('falls back to the socket address when no proxy header is present', () => {
    expect(getPageSubmitter({}, '10.0.0.1').ip).toBe('10.0.0.1');
  });
});
