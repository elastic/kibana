/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { buildPageUrl, getPageSubmitter, parsePageSubmission, resolvePage } from './page_service';
import { ExternalResumeError } from '../external_resume/external_resume_error';

const SPACE_ID = 'default';
const SECRET = 'q1W2e3R4t5Y6u7I8o9P0a1S2d3F4g5H6j7K8l9Z0x1C';
const REF = { spaceId: SPACE_ID, workflowId: 'report-incident', secret: SECRET };

const pageWorkflow = (overrides: Partial<WorkflowDetailDto> = {}) =>
  ({
    id: 'report-incident',
    enabled: true,
    valid: true,
    definition: {
      settings: { run_as: 'elastic/workflow-pages' },
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

const lookup = (workflow: WorkflowDetailDto | null, secretValid = true) => ({
  verifyPageSecret: jest.fn().mockResolvedValue(secretValid),
  getPageWorkflow: jest.fn().mockResolvedValue(workflow),
});

const resolve = (workflow: WorkflowDetailDto | null, secretValid = true) =>
  resolvePage(lookup(workflow, secretValid), REF);

const expectHiddenNotFound = (promise: Promise<unknown>) =>
  expect(promise).rejects.toEqual(expect.objectContaining({ statusCode: 404, expose: false }));

describe('resolvePage', () => {
  it('checks the secret, then returns the page trigger of the workflow', async () => {
    const deps = lookup(pageWorkflow());

    const page = await resolvePage(deps, REF);

    expect(deps.verifyPageSecret).toHaveBeenCalledWith(REF);
    expect(deps.getPageWorkflow).toHaveBeenCalledWith('report-incident', SPACE_ID);
    expect(page.secret).toBe(SECRET);
    expect(page.trigger.title).toBe('Report an incident');
  });

  it('does not load the workflow when the secret is wrong', async () => {
    const deps = lookup(pageWorkflow(), false);

    await expectHiddenNotFound(resolvePage(deps, REF));
    expect(deps.getPageWorkflow).not.toHaveBeenCalled();
  });

  it('hides why a request failed', async () => {
    await expectHiddenNotFound(resolve(null));
    await expectHiddenNotFound(resolve(pageWorkflow({ enabled: false })));
    await expectHiddenNotFound(resolve(pageWorkflow({ valid: false, definition: null })));
    await expectHiddenNotFound(
      resolve(
        pageWorkflow({
          definition: {
            settings: { run_as: 'elastic/workflow-pages' },
            triggers: [{ type: 'manual' }],
          },
        } as unknown as Partial<WorkflowDetailDto>)
      )
    );
  });

  it('keeps the page offline when the workflow has no service account', async () => {
    await expectHiddenNotFound(
      resolve(
        pageWorkflow({
          definition: { triggers: [{ type: 'page', title: 'Report an incident' }] },
        } as unknown as Partial<WorkflowDetailDto>)
      )
    );
  });
});

describe('buildPageUrl', () => {
  it('puts the workflow id and secret in the page path', () => {
    expect(buildPageUrl({ basePath: '/s/marketing', workflowId: 'a b', secret: SECRET })).toBe(
      `/s/marketing/pages/a%20b/k/${SECRET}`
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

  describe('with if/then rules', () => {
    const conditionalSchema = {
      type: 'object' as const,
      properties: { notify: { type: 'boolean' as const } },
      allOf: [
        {
          if: { properties: { notify: { const: true } }, required: ['notify'] },
          then: {
            properties: { email: { type: 'string' as const, format: 'email' as const } },
            required: ['email'],
          },
        },
      ],
    };

    it('requires a field once its rule applies', () => {
      expect(() =>
        parsePageSubmission({ notify: true }, conditionalSchema, { isJson: true })
      ).toThrow('email: This field is required');
    });

    it('keeps a conditional field from a JSON submission', () => {
      expect(
        parsePageSubmission({ notify: true, email: 'a@example.com' }, conditionalSchema, {
          isJson: true,
        })
      ).toEqual({ notify: true, email: 'a@example.com' });
    });

    it('drops a conditional field whose rule does not apply', () => {
      expect(
        parsePageSubmission({ notify: false, email: 'a@example.com' }, conditionalSchema, {
          isJson: true,
        })
      ).toEqual({ notify: false });
    });
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
