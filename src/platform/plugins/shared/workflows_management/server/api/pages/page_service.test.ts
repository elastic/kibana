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
const WORKFLOW_ID = 'report-incident';

const pageWorkflow = (overrides: Partial<WorkflowDetailDto> = {}) =>
  ({
    id: WORKFLOW_ID,
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

const secretFor = (generation: number) =>
  computePageSecret(KEY, { spaceId: SPACE_ID, workflowId: WORKFLOW_ID, generation });

const resolve = (workflow: WorkflowDetailDto | null, secret: string) =>
  resolvePage(jest.fn().mockResolvedValue(workflow), {
    signingKey: KEY,
    spaceId: SPACE_ID,
    workflowId: WORKFLOW_ID,
    secret,
  });

const expectHiddenNotFound = (promise: Promise<unknown>) =>
  expect(promise).rejects.toEqual(expect.objectContaining({ statusCode: 404, expose: false }));

describe('resolvePage', () => {
  it('loads the workflow by id and returns its page trigger', async () => {
    const getWorkflow = jest.fn().mockResolvedValue(pageWorkflow());

    const page = await resolvePage(getWorkflow, {
      signingKey: KEY,
      spaceId: SPACE_ID,
      workflowId: WORKFLOW_ID,
      secret: secretFor(0),
    });

    expect(getWorkflow).toHaveBeenCalledWith(WORKFLOW_ID, SPACE_ID);
    expect(page.trigger.title).toBe('Report an incident');
  });

  it('accepts the secret of the current generation only', async () => {
    const rotated = pageWorkflow({ pageGeneration: 2 });

    await expect(resolve(rotated, secretFor(2))).resolves.toBeDefined();
    await expectHiddenNotFound(resolve(rotated, secretFor(1)));
  });

  it('hides why a request failed', async () => {
    await expectHiddenNotFound(resolve(null, secretFor(0)));
    await expectHiddenNotFound(resolve(pageWorkflow(), 'wrong'));
    await expectHiddenNotFound(resolve(pageWorkflow({ enabled: false }), secretFor(0)));
    await expectHiddenNotFound(
      resolve(pageWorkflow({ valid: false, definition: null }), secretFor(0))
    );
    await expectHiddenNotFound(
      resolve(
        pageWorkflow({
          definition: { triggers: [{ type: 'manual' }] },
        } as unknown as Partial<WorkflowDetailDto>),
        secretFor(0)
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
