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

const SPACE_ID = 'default';
const PAGE_KEY = '0b5f3c1e-8d2a-4f6b-9c7e-1a2b3c4d5e6f';

const pageWorkflow = (overrides: Partial<WorkflowDetailDto> = {}) =>
  ({
    id: 'report-incident',
    pageKey: PAGE_KEY,
    enabled: true,
    valid: true,
    definition: {
      triggers: [
        { type: 'manual' },
        {
          type: 'page',
          title: 'Report an incident',
          inputs: { type: 'object', properties: { summary: { type: 'string' } } },
        },
      ],
    },
    ...overrides,
  } as unknown as WorkflowDetailDto);

const resolve = (workflow: WorkflowDetailDto | null) =>
  resolvePage(jest.fn().mockResolvedValue(workflow), { spaceId: SPACE_ID, pageKey: PAGE_KEY });

const expectHiddenNotFound = (promise: Promise<unknown>) =>
  expect(promise).rejects.toEqual(expect.objectContaining({ statusCode: 404, expose: false }));

describe('resolvePage', () => {
  it('looks the workflow up by page key and returns its page trigger', async () => {
    const getWorkflowByPageKey = jest.fn().mockResolvedValue(pageWorkflow());

    const page = await resolvePage(getWorkflowByPageKey, { spaceId: SPACE_ID, pageKey: PAGE_KEY });

    expect(getWorkflowByPageKey).toHaveBeenCalledWith(PAGE_KEY, SPACE_ID);
    expect(page.pageKey).toBe(PAGE_KEY);
    expect(page.trigger.title).toBe('Report an incident');
  });

  it('hides why a request failed', async () => {
    await expectHiddenNotFound(resolve(null));
    await expectHiddenNotFound(resolve(pageWorkflow({ enabled: false })));
    await expectHiddenNotFound(resolve(pageWorkflow({ valid: false, definition: null })));
    await expectHiddenNotFound(
      resolve(
        pageWorkflow({
          definition: { triggers: [{ type: 'manual' }] },
        } as unknown as Partial<WorkflowDetailDto>)
      )
    );
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
