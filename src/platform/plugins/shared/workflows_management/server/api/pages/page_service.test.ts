/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPageSubmitter, parsePageSubmission, resolvePage } from './page_service';
import { computePageToken, verifyPageToken } from './page_token';
import { ExternalResumeError } from '../external_resume/external_resume_error';

const SIGNING_KEY = 'a'.repeat(32);
const SPACE_ID = 'default';
const WORKFLOW_ID = 'workflow-1';

const validToken = () => computePageToken(SIGNING_KEY, SPACE_ID, WORKFLOW_ID);

const workflowWithPage = {
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
};

describe('page token', () => {
  it('verifies a token it produced', () => {
    expect(verifyPageToken(SIGNING_KEY, SPACE_ID, WORKFLOW_ID, validToken())).toBe(true);
  });

  it('rejects a token minted for another space or workflow', () => {
    expect(verifyPageToken(SIGNING_KEY, 'other-space', WORKFLOW_ID, validToken())).toBe(false);
    expect(verifyPageToken(SIGNING_KEY, SPACE_ID, 'other-workflow', validToken())).toBe(false);
  });

  it('rejects a token of a different length without throwing', () => {
    expect(verifyPageToken(SIGNING_KEY, SPACE_ID, WORKFLOW_ID, 'short')).toBe(false);
  });
});

describe('resolvePage', () => {
  const args = {
    signingKey: SIGNING_KEY,
    spaceId: SPACE_ID,
    workflowId: WORKFLOW_ID,
    token: validToken(),
  };

  it('returns the page trigger and its input schema', () => {
    const page = resolvePage(workflowWithPage, args);
    expect(page.trigger.title).toBe('Report an incident');
    expect(page.inputsSchema).toEqual({
      type: 'object',
      properties: { summary: { type: 'string' } },
    });
  });

  it('checks the token before looking at the workflow', () => {
    expect(() => resolvePage(undefined, { ...args, token: 'wrong' })).toThrow(ExternalResumeError);
  });

  it('does not expose why a request failed', () => {
    const cases = [
      [undefined, 404],
      [{ ...workflowWithPage, enabled: false }, 404],
      [{ enabled: true, valid: true, definition: { triggers: [{ type: 'manual' }] } }, 404],
    ] as const;

    for (const [workflow, statusCode] of cases) {
      try {
        resolvePage(workflow, args);
        throw new Error('expected resolvePage to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ExternalResumeError);
        expect((error as ExternalResumeError).statusCode).toBe(statusCode);
        expect((error as ExternalResumeError).expose).toBe(false);
      }
    }
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
    expect(Date.parse(submitter.at)).not.toBeNaN();
  });

  it('falls back to the socket address when no proxy header is present', () => {
    expect(getPageSubmitter({}, '10.0.0.1').ip).toBe('10.0.0.1');
  });

  it('truncates an oversized user agent', () => {
    const submitter = getPageSubmitter({ 'user-agent': 'x'.repeat(1000) }, undefined);
    expect(submitter.userAgent).toHaveLength(512);
  });
});
