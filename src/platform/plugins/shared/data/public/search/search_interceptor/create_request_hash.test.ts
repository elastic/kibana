/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRequestHashForBackgroundSearches } from './create_request_hash';

describe('createRequestHashForBackgroundSearches', () => {
  it('ignores `preference` and sessionId', () => {
    const request = {
      foo: 'bar',
    };
    const withPreference = {
      ...request,
      preference: 1234,
      sessionId: 'abcd',
    };

    expect(createRequestHashForBackgroundSearches(request)).not.toBeUndefined();

    expect(createRequestHashForBackgroundSearches(request)).toEqual(
      createRequestHashForBackgroundSearches(withPreference)
    );
  });
});
