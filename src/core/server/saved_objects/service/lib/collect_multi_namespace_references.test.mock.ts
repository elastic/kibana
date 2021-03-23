/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as InternalUtils from './internal_utils';

export const mockRawDocExistsInNamespace = jest.fn() as jest.MockedFunction<
  typeof InternalUtils['rawDocExistsInNamespace']
>;

jest.mock('./internal_utils', () => {
  const actual = jest.requireActual('./internal_utils');
  return {
    ...actual,
    rawDocExistsInNamespace: mockRawDocExistsInNamespace,
  };
});
