/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorActionErrorMeta, setConnectorActionErrorMeta } from './connector_spec';

describe('connector action error metadata', () => {
  it('stores and reads size metadata for object errors', () => {
    const error = new Error('boom');

    setConnectorActionErrorMeta(error, {
      contentLengthBytes: 1024,
      estimatedOutputBytes: 2048,
    });

    expect(getConnectorActionErrorMeta(error)).toEqual({
      contentLengthBytes: 1024,
      estimatedOutputBytes: 2048,
    });
  });

  it('merges metadata updates', () => {
    const error = new Error('boom');

    setConnectorActionErrorMeta(error, { contentLengthBytes: 1024 });
    setConnectorActionErrorMeta(error, { estimatedOutputBytes: 2048 });

    expect(getConnectorActionErrorMeta(error)).toEqual({
      contentLengthBytes: 1024,
      estimatedOutputBytes: 2048,
    });
  });

  it('ignores primitive errors', () => {
    setConnectorActionErrorMeta('boom', { contentLengthBytes: 1024 });

    expect(getConnectorActionErrorMeta('boom')).toBeUndefined();
  });
});
