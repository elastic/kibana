/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { ExternalServices } from '../types';
import { useStreamsNavigation } from './use_streams_navigation';

const mockGetRedirectUrl = jest.fn((params: { name: string }) => `/app/streams/${params.name}`);

const createMockExternalServices = ({
  hasStreamsFeature = false,
  hasLocator = true,
}: {
  hasStreamsFeature?: boolean;
  hasLocator?: boolean;
} = {}): ExternalServices =>
  ({
    share: hasLocator
      ? {
          url: {
            locators: {
              get: jest.fn(() => ({ getRedirectUrl: mockGetRedirectUrl })),
            },
          },
        }
      : undefined,
    discoverShared: {
      features: {
        registry: {
          getById: jest.fn((id: string) =>
            hasStreamsFeature && id === 'streams' ? {} : undefined
          ),
        },
      },
    },
  } as unknown as ExternalServices);

describe('useStreamsNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canNavigate', () => {
    it('returns true when streams feature is registered', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: true }))
      );

      expect(result.current.canNavigate).toBe(true);
    });

    it('returns false when streams feature is not registered', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: false }))
      );

      expect(result.current.canNavigate).toBe(false);
    });
  });

  describe('getStreamUrl', () => {
    it('returns a URL for a valid data stream when user has permissions', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: true }))
      );

      expect(result.current.getStreamUrl('metrics-system.cpu-default')).toBe(
        '/app/streams/metrics-system.cpu-default'
      );
    });

    it('returns undefined when user lacks permissions', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: false }))
      );

      expect(result.current.getStreamUrl('metrics-system.cpu-default')).toBeUndefined();
    });

    it('returns undefined when locator is unavailable', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(
          createMockExternalServices({ hasStreamsFeature: true, hasLocator: false })
        )
      );

      expect(result.current.getStreamUrl('metrics-system.cpu-default')).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: true }))
      );

      expect(result.current.getStreamUrl('')).toBeUndefined();
    });

    it('returns undefined for wildcard patterns', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: true }))
      );

      expect(result.current.getStreamUrl('metrics-*')).toBeUndefined();
    });

    it('returns undefined for CCS remote index names', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: true }))
      );

      expect(
        result.current.getStreamUrl('remote_cluster:metrics-system.cpu-default')
      ).toBeUndefined();
    });

    it('returns a URL for a local data stream even when CCS names exist elsewhere', () => {
      const { result } = renderHook(() =>
        useStreamsNavigation(createMockExternalServices({ hasStreamsFeature: true }))
      );

      expect(result.current.getStreamUrl('metrics-local-default')).toBe(
        '/app/streams/metrics-local-default'
      );
    });
  });
});
