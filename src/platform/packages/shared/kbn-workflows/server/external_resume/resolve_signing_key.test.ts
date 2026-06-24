/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import {
  resetExternalResumeSigningKeyForTests,
  resolveExternalResumeSigningKey,
} from './resolve_signing_key';

describe('resolveExternalResumeSigningKey', () => {
  const logger = { warn: jest.fn() } as unknown as Logger;

  beforeEach(() => {
    resetExternalResumeSigningKeyForTests();
    jest.clearAllMocks();
  });

  it('returns configured keys and shares them across plugins', () => {
    const configured = 'configured-signing-key-with-at-least-32-characters';
    const fromManagement = resolveExternalResumeSigningKey(
      configured,
      logger,
      'workflowsManagement.externalResume.signingKey'
    );
    const fromExecutionEngine = resolveExternalResumeSigningKey(
      undefined,
      logger,
      'workflowsExecutionEngine.externalResume.signingKey'
    );

    expect(fromManagement).toBe(configured);
    expect(fromExecutionEngine).toBe(configured);
  });

  it('reuses the same ephemeral key when neither plugin config is set', () => {
    const first = resolveExternalResumeSigningKey(
      undefined,
      logger,
      'workflowsManagement.externalResume.signingKey'
    );
    const second = resolveExternalResumeSigningKey(
      undefined,
      logger,
      'workflowsExecutionEngine.externalResume.signingKey'
    );

    expect(first).toEqual(second);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
