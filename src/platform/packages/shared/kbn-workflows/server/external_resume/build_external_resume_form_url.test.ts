/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildExternalResumeFormUrl } from './build_external_resume_form_url';

describe('buildExternalResumeFormUrl', () => {
  it('builds a default-space form URL with token', () => {
    const url = buildExternalResumeFormUrl({
      kibanaUrl: 'https://kibana.example',
      spaceId: 'default',
      executionId: 'exec-1',
      stepId: 'step-exec-1',
      token: 'resume-token',
    });

    expect(url).toBe(
      'https://kibana.example/api/workflows/executions/exec-1/steps/step-exec-1/resume/external/form?token=resume-token'
    );
  });

  it('includes the space prefix for non-default spaces', () => {
    const url = buildExternalResumeFormUrl({
      kibanaUrl: 'https://kibana.example',
      spaceId: 'marketing',
      executionId: 'exec-1',
      stepId: 'step-exec-1',
      token: 'resume-token',
    });

    expect(url).toContain(
      '/s/marketing/api/workflows/executions/exec-1/steps/step-exec-1/resume/external/form'
    );
  });
});
