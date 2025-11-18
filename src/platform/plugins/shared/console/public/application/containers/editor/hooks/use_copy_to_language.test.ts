/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock must be defined before imports
jest.mock('../../../../services', () => ({
  convertRequestToLanguage: jest.fn(),
  StorageKeys: {
    DEFAULT_LANGUAGE: 'sense:defaultLanguage',
  },
}));

import { renderHook, act } from '@testing-library/react';
import type { NotificationsStart } from '@kbn/core/public';
import { useCopyToLanguage } from './use_copy_to_language';
import type { Storage } from '../../../../services';
import { convertRequestToLanguage } from '../../../../services';
import type { EsHostService } from '../../../lib';
import type { EditorRequest } from '../types';

const mockConvertRequestToLanguage = convertRequestToLanguage as jest.MockedFunction<
  typeof convertRequestToLanguage
>;

describe('useCopyToLanguage', () => {
  let mockStorage: jest.Mocked<Storage>;
  let mockEsHostService: jest.Mocked<EsHostService>;
  let mockToasts: jest.Mocked<NotificationsStart['toasts']>;
  let mockGetRequestsCallback: jest.Mock;
  let mockIsKbnRequestSelectedCallback: jest.Mock;
  let mockClipboard: { writeText: jest.Mock };

  beforeEach(() => {
    mockStorage = {
      get: jest.fn().mockReturnValue('curl'),
      set: jest.fn(),
    } as any;

    mockEsHostService = {
      getHost: jest.fn().mockReturnValue('http://localhost:9200'),
    } as any;

    mockToasts = {
      addSuccess: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as any;

    mockGetRequestsCallback = jest
      .fn()
      .mockResolvedValue([{ method: 'GET', url: '_search', data: [] }] as EditorRequest[]);

    mockIsKbnRequestSelectedCallback = jest.fn().mockResolvedValue(false);

    mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };

    Object.defineProperty(window.navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true,
    });

    mockConvertRequestToLanguage.mockResolvedValue({
      data: 'converted code',
      error: null,
    });

    jest.clearAllMocks();
  });

  it('should initialize with default language from storage', () => {
    mockStorage.get.mockReturnValue('python');

    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    expect(result.current.currentLanguage).toBe('python');
    expect(mockStorage.get).toHaveBeenCalledWith('sense:defaultLanguage', 'curl');
  });

  it('should copy requests to the current language', async () => {
    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    await act(async () => {
      await result.current.copyToLanguage('python');
    });

    expect(mockConvertRequestToLanguage).toHaveBeenCalledWith({
      language: 'python',
      esHost: 'http://localhost:9200',
      kibanaHost: window.location.origin,
      requests: [{ method: 'GET', url: '_search', data: [] }],
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith('converted code');
    expect(mockToasts.addSuccess).toHaveBeenCalled();
  });

  it('should prevent copying Kibana requests to non-curl languages', async () => {
    mockGetRequestsCallback.mockResolvedValue([
      { method: 'GET', url: 'kbn:/api/spaces/space', data: [] },
    ] as EditorRequest[]);

    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    await act(async () => {
      await result.current.copyToLanguage('python');
    });

    expect(mockConvertRequestToLanguage).not.toHaveBeenCalled();
    expect(mockToasts.addDanger).toHaveBeenCalledWith({
      title: 'Kibana requests can only be copied to curl',
    });
  });

  it('should handle conversion errors', async () => {
    mockConvertRequestToLanguage.mockResolvedValue({
      data: null,
      error: { error: 'Conversion failed', message: 'Conversion failed' },
    } as any);

    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    await act(async () => {
      await result.current.copyToLanguage();
    });

    expect(mockToasts.addDanger).toHaveBeenCalled();
    expect(mockClipboard.writeText).not.toHaveBeenCalled();
  });

  it('should change language and persist to storage', async () => {
    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    act(() => {
      result.current.handleLanguageChange('python');
    });

    expect(mockStorage.set).toHaveBeenCalledWith('sense:defaultLanguage', 'python');
    expect(result.current.currentLanguage).toBe('python');
  });

  it('should force curl when Kibana request is selected', async () => {
    mockIsKbnRequestSelectedCallback.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    await act(async () => {
      await result.current.checkIsKbnRequestSelected();
    });

    expect(result.current.currentLanguage).toBe('curl');
    expect(result.current.isKbnRequestSelected).toBe(true);
  });

  it('should use curl for Kibana requests in onCopyToLanguageSubmit', async () => {
    mockIsKbnRequestSelectedCallback.mockResolvedValue(true);
    mockGetRequestsCallback.mockResolvedValue([
      { method: 'GET', url: 'kbn:/api/spaces/space', data: [] },
    ] as EditorRequest[]);

    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    await act(async () => {
      await result.current.onCopyToLanguageSubmit();
    });

    expect(mockConvertRequestToLanguage).toHaveBeenCalledWith({
      language: 'curl',
      esHost: 'http://localhost:9200',
      kibanaHost: window.location.origin,
      requests: [{ method: 'GET', url: 'kbn:/api/spaces/space', data: [] }],
    });
  });

  it('should handle clipboard write errors gracefully', async () => {
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

    const { result } = renderHook(() =>
      useCopyToLanguage({
        storage: mockStorage,
        esHostService: mockEsHostService,
        toasts: mockToasts,
        getRequestsCallback: mockGetRequestsCallback,
        isKbnRequestSelectedCallback: mockIsKbnRequestSelectedCallback,
      })
    );

    await act(async () => {
      await result.current.copyToLanguage('python');
    });

    expect(mockToasts.addDanger).toHaveBeenCalledWith({
      title: 'Could not copy to clipboard',
    });
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
  });
});
