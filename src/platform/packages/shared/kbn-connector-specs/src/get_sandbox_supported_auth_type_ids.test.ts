/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSandboxSupportedAuthTypeIds } from './get_sandbox_supported_auth_type_ids';

describe('getSandboxSupportedAuthTypeIds', () => {
  it('returns empty when auth is undefined', () => {
    expect(getSandboxSupportedAuthTypeIds(undefined)).toEqual([]);
  });

  it('ignores string auth types and defs without supportsSandbox', () => {
    expect(
      getSandboxSupportedAuthTypeIds({
        types: ['bearer', { type: 'basic', defaults: {} }],
      })
    ).toEqual([]);
  });

  it('returns only auth types with supportsSandbox true', () => {
    expect(
      getSandboxSupportedAuthTypeIds({
        types: [
          'none',
          { type: 'bearer', supportsSandbox: true, defaults: {} },
          { type: 'basic', supportsSandbox: false, defaults: {} },
          { type: 'oauth_authorization_code', supportsSandbox: true, defaults: {} },
        ],
      })
    ).toEqual(['bearer', 'oauth_authorization_code']);
  });
});
