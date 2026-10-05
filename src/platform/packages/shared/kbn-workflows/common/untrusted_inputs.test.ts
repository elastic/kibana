/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInheritedChildMetadata, hasUntrustedInputs } from './constants';

describe('untrusted inputs metadata', () => {
  it('is set only by an exact true flag', () => {
    expect(hasUntrustedInputs({ untrustedInputs: true })).toBe(true);
    expect(hasUntrustedInputs({ untrustedInputs: 'true' })).toBe(false);
    expect(hasUntrustedInputs({})).toBe(false);
    expect(hasUntrustedInputs(undefined)).toBe(false);
  });

  it('passes only the flag to a child workflow', () => {
    expect(
      getInheritedChildMetadata({ untrustedInputs: true, submitter: { ip: '203.0.113.7' } })
    ).toEqual({ metadata: { untrustedInputs: true } });
    expect(getInheritedChildMetadata({ submittedVia: 'manual' })).toBeUndefined();
  });
});
