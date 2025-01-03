/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import { useShareTabsContext } from '.';

describe('share menu context', () => {
  describe('useShareTabsContext', () => {
    it('throws an error if used outside of ShareMenuProvider tree', () => {
      const { result } = renderHook(() => useShareTabsContext());

      expect(result.error?.message).toEqual(
        expect.stringContaining(
          'Failed to call `useShareTabsContext` because the context from ShareMenuProvider is missing.'
        )
      );
    });
  });
});
