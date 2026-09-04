/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  classifyMechanism,
  dominantMechanism,
  isFixCandidate,
  normalizeErrorMessage,
} from './classify';

describe('normalizeErrorMessage', () => {
  it('strips terminal colouring', () => {
    expect(normalizeErrorMessage('\u001b[31mboom\u001b[0m')).toBe('boom');
  });

  it('keeps only the first line', () => {
    expect(normalizeErrorMessage('first line\n  at foo()\n  at bar()')).toBe('first line');
  });
});

describe('classifyMechanism', () => {
  it('returns unclassified for absent or unrecognised messages', () => {
    expect(classifyMechanism(undefined)).toBe('unclassified');
    expect(classifyMechanism('')).toBe('unclassified');
    expect(classifyMechanism('something nobody has seen before')).toBe('unclassified');
  });

  it.each([
    ['KbnClientRequesterError: [POST /api/foo] failed with 503', 'infra'],
    ['ResponseError: search_phase_execution_exception', 'infra'],
    ['Test timeout of 30000ms exceeded.', 'test-timeout'],
    ['page.goto: net::ERR_CONNECTION_REFUSED', 'navigation'],
    ['TimeoutError: locator.click: Timeout 10000ms exceeded.', 'ui-timeout'],
    ['expect(locator).toBeVisible() failed', 'ui-state'],
    ['expect(response).toHaveStatusCode(200)', 'api-status'],
    ['expect(received).toEqual(expected)', 'data-assertion'],
  ])('classifies %s as %s', (message, expected) => {
    expect(classifyMechanism(message)).toBe(expected);
  });

  it('classifies a bare hook failure as hook-setup', () => {
    expect(classifyMechanism('Failed in "beforeAll" hook defined at line 12')).toBe('hook-setup');
  });

  it('prefers infra over hook-setup when a dependency fails inside a hook', () => {
    // Ordering is load-bearing: mechanism gates fix eligibility, so a broken service must not
    // be reported as a test-setup problem and routed to the fixer.
    expect(
      classifyMechanism('Error in "beforeAll" hook: KbnClientRequesterError: 500 from /api/status')
    ).toBe('infra');
  });

  it('classifies through terminal colouring', () => {
    expect(classifyMechanism('\u001b[31mTest timeout of 30000ms exceeded.\u001b[0m')).toBe(
      'test-timeout'
    );
  });
});

describe('isFixCandidate', () => {
  it('blocks automated fixes for infrastructure failures', () => {
    expect(isFixCandidate('infra')).toBe(false);
  });

  it('allows fixes for test-owned mechanisms', () => {
    expect(isFixCandidate('ui-timeout')).toBe(true);
    expect(isFixCandidate('data-assertion')).toBe(true);
    expect(isFixCandidate('unclassified')).toBe(true);
  });
});

describe('dominantMechanism', () => {
  it('returns unclassified for an empty breakdown', () => {
    expect(dominantMechanism({})).toBe('unclassified');
  });

  it('picks the mechanism with the most failures', () => {
    expect(dominantMechanism({ infra: 3, 'ui-timeout': 11, 'ui-state': 2 })).toBe('ui-timeout');
  });

  it('breaks ties deterministically', () => {
    expect(dominantMechanism({ 'ui-timeout': 4, infra: 4 })).toBe('infra');
    expect(dominantMechanism({ infra: 4, 'ui-timeout': 4 })).toBe('infra');
  });
});
