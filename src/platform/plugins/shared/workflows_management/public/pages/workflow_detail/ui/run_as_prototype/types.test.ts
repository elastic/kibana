/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyScenarioAccounts, bindingStatusOf, DEFAULT_ACCOUNTS } from './types';

describe('run_as_prototype types', () => {
  it('maps fresh / bound / unauthorized / deleted scenarios', () => {
    expect(applyScenarioAccounts('fresh', DEFAULT_ACCOUNTS)).toEqual(
      expect.objectContaining({ draftRunAs: null, savedRunAs: null })
    );
    expect(applyScenarioAccounts('bound', DEFAULT_ACCOUNTS)).toEqual(
      expect.objectContaining({
        draftRunAs: 'svc-obs-triage',
        savedRunAs: 'svc-obs-triage',
      })
    );

    const unauthorized = applyScenarioAccounts('unauthorized', DEFAULT_ACCOUNTS);
    expect(unauthorized.draftRunAs).toBe('svc-sec-response');
    expect(bindingStatusOf(unauthorized.draftRunAs, unauthorized.accounts)).toBe('unauthorized');

    const deleted = applyScenarioAccounts('deleted', DEFAULT_ACCOUNTS);
    expect(deleted.draftRunAs).toBe('svc-old-pipeline');
    expect(bindingStatusOf(deleted.draftRunAs, deleted.accounts)).toBe('missing');
  });
});
