/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useShareTypeContext, useShareContext } from '.';

describe('share menu context', () => {
  describe('useShareContext', () => {
    it('throws an error if used outside of ShareMenuProvider tree', () => {
      expect(() => renderHook(() => useShareContext())).toThrow(
        /^Failed to call `useShareContext` because the context from ShareMenuProvider is missing./
      );
    });
  });

  describe('useShareTabsContext', () => {
    it('throws an error if used outside of ShareMenuProvider tree', () => {
      expect(() => renderHook(() => useShareTypeContext('embed'))).toThrow(
        /^Failed to call `useShareContext` because the context from ShareMenuProvider is missing./
      );
    });
  });
});
