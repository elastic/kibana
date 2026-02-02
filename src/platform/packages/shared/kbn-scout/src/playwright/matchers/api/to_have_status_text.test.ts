/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect as apiExpect } from '.';

describe('toHaveStatusText', () => {
  it('should pass when status text matches', () => {
    // kbnClient interface (statusText)
    expect(() => apiExpect({ statusText: 'OK' }).toHaveStatusText('OK')).not.toThrow();
    // apiClient interface (statusMessage)
    expect(() => apiExpect({ statusMessage: 'OK' }).toHaveStatusText('OK')).not.toThrow();
  });

  it('should fail when status text does not match', () => {
    expect(() => apiExpect({ statusText: 'Not Found' }).toHaveStatusText('OK')).toThrow();
  });
});
