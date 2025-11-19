/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  ContentEditorActionProvider,
  useContentEditorOpener,
} from './content_editor_action_context';

// Mock `useOpenContentEditor` from the content-editor package.
const mockOpenContentEditor = jest.fn(() => jest.fn());
jest.mock('@kbn/content-management-content-editor', () => ({
  useOpenContentEditor: () => mockOpenContentEditor,
}));

describe('ContentEditorActionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useContentEditorOpener', () => {
    it('should return null when used outside of ContentEditorActionProvider', () => {
      const { result } = renderHook(() => useContentEditorOpener());

      expect(result.current).toBeNull();
    });

    it('should return the openContentEditor function when used inside ContentEditorActionProvider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentEditorActionProvider>{children}</ContentEditorActionProvider>
      );

      const { result } = renderHook(() => useContentEditorOpener(), { wrapper });

      expect(result.current).toBe(mockOpenContentEditor);
    });
  });

  describe('ContentEditorActionProvider', () => {
    it('should render children', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentEditorActionProvider>{children}</ContentEditorActionProvider>
      );

      const { result } = renderHook(() => 'test-value', { wrapper });

      expect(result.current).toBe('test-value');
    });

    it('should provide the same opener function to all consumers', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ContentEditorActionProvider>{children}</ContentEditorActionProvider>
      );

      const { result: result1 } = renderHook(() => useContentEditorOpener(), { wrapper });
      const { result: result2 } = renderHook(() => useContentEditorOpener(), { wrapper });

      expect(result1.current).toBe(result2.current);
    });
  });
});
