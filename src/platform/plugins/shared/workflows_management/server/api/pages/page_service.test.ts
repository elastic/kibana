/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { computePageSecret } from './page_secret';
import { getPageSubmitter, parsePageSubmission, resolvePage } from './page_service';
import { ExternalResumeError } from '../external_resume/external_resume_error';

const KEY = 'k'.repeat(32);
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

const secretFor = (pageKey: string) => computePageSecret(KEY, { spaceId: SPACE_ID, pageKey });

const resolve = (workflow: WorkflowDetailDto | null, secret: string, pageKey = PAGE_KEY) =>
  resolvePage(jest.fn().mockResolvedValue(workflow), {
    signingKey: KEY,
    spaceId: SPACE_ID,
    pageKey,
    secret,
  });

const expectHiddenNotFound = (promise: Promise<unknown>) =>
  expect(promise).rejects.toEqual(expect.objectContaining({ statusCode: 404, expose: false }));

describe('resolvePage', () => {
  it('looks the workflow up by page key and returns its page trigger', async () => {
    const getWorkflowByPageKey = jest.fn().mockResolvedValue(pageWorkflow());

    const page = await resolvePage(getWorkflowByPageKey, {
      signingKey: KEY,
      spaceId: SPACE_ID,
      pageKey: PAGE_KEY,
      secret: secretFor(PAGE_KEY),
    });

    expect(getWorkflowByPageKey).toHaveBeenCalledWith(PAGE_KEY, SPACE_ID);
    expect(page.pageKey).toBe(PAGE_KEY);
    expect(page.trigger.title).toBe('Report an incident');
  });

  it('checks the secret before any lookup', async () => {
    const getWorkflowByPageKey = jest.fn();

    await expectHiddenNotFound(
      resolvePage(getWorkflowByPageKey, {
        signingKey: KEY,
        spaceId: SPACE_ID,
        pageKey: PAGE_KEY,
        secret: 'wrong',
      })
    );
    expect(getWorkflowByPageKey).not.toHaveBeenCalled();
  });

  it('rejects the secret of a rotated-away page key', async () => {
    await expectHiddenNotFound(resolve(pageWorkflow(), secretFor('previous-key')));
  });

  it('hides why a request failed', async () => {
    await expectHiddenNotFound(resolve(null, secretFor(PAGE_KEY)));
    await expectHiddenNotFound(resolve(pageWorkflow({ enabled: false }), secretFor(PAGE_KEY)));
    await expectHiddenNotFound(
      resolve(pageWorkflow({ valid: false, definition: null }), secretFor(PAGE_KEY))
    );
    await expectHiddenNotFound(
      resolve(
        pageWorkflow({
          definition: { triggers: [{ type: 'manual' }] },
        } as unknown as Partial<WorkflowDetailDto>),
        secretFor(PAGE_KEY)
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
