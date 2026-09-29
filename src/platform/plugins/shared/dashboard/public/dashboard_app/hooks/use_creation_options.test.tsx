/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { ScopedHistory } from '@kbn/core-application-browser';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { BehaviorSubject } from 'rxjs';

import { screenshotModeService } from '../../services/kibana_services';
import { useCreationOptions } from './use_creation_options';
import { extractDashboardState, loadAndRemoveDashboardState } from '../url';
import {
  getSearchSessionIdFromURL,
  getSessionURLObservable,
} from '../url/search_sessions_integration';

const mockKbnUrlStateStorage = {
  get: vi.fn(),
} as unknown as IKbnUrlStateStorage;

vi.mock('../url', () => {
      const mocked = {
      extractDashboardState: vi.fn(),
      loadAndRemoveDashboardState: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../url/search_sessions_integration', () => {
      const mocked = {
      createSessionRestorationDataProvider: vi.fn(),
      getSearchSessionIdFromURL: vi.fn(),
      getSessionURLObservable: vi.fn(),
      removeSearchSessionIdFromURL: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useCreationOptions', () => {
  const validateOutcome = vi.fn().mockReturnValue('valid');

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(screenshotModeService, 'isScreenshotMode').mockReturnValue(false);
    vi.spyOn(screenshotModeService, 'getScreenshotContext').mockReturnValue(undefined);
    (mockKbnUrlStateStorage.get as Mock).mockReturnValue(undefined);
    (extractDashboardState as Mock).mockReturnValue({});
    (loadAndRemoveDashboardState as Mock).mockReturnValue({});
    (getSearchSessionIdFromURL as Mock).mockReturnValue(undefined);
    (getSessionURLObservable as Mock).mockReturnValue(
      new BehaviorSubject<string | undefined>(undefined)
    );
  });

  it('clears history.state after merging locator dashboard payload', async () => {
    const history = createMemoryHistory();
    const replaceSpy = vi.spyOn(history, 'replace');
    history.replace({
      pathname: '/',
      search: '',
      hash: '',
      state: {
        title: 'From locator',
        viewMode: 'edit',
      },
    });
    replaceSpy.mockClear();
    (extractDashboardState as Mock).mockReturnValue({
      title: 'From locator',
      viewMode: 'edit',
    });

    const { result } = renderHook(() =>
      useCreationOptions({
        history,
        getScopedHistory: () => history as unknown as ScopedHistory,
        kbnUrlStateStorage: mockKbnUrlStateStorage,
        validateOutcome,
        incomingEmbeddables: undefined,
      })
    );

    const creationOptions = await result.current();
    expect(creationOptions.getInitialInput?.()).toEqual({
      title: 'From locator',
      viewMode: 'edit',
    });
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/',
        search: '',
        hash: '',
        state: undefined,
      })
    );
    expect(history.location.state).toBeUndefined();
  });

  it('does not clear history.state when there is no locator dashboard payload', async () => {
    const history = createMemoryHistory();
    const replaceSpy = vi.spyOn(history, 'replace');
    history.replace({
      pathname: '/',
      search: '',
      hash: '',
      state: { notConsumedByDashboardExtract: true },
    });
    replaceSpy.mockClear();

    const { result } = renderHook(() =>
      useCreationOptions({
        history,
        getScopedHistory: () => history as unknown as ScopedHistory,
        kbnUrlStateStorage: mockKbnUrlStateStorage,
        validateOutcome,
        incomingEmbeddables: undefined,
      })
    );

    const creationOptions = await result.current();
    creationOptions.getInitialInput?.();

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(history.location.state).toEqual({
      notConsumedByDashboardExtract: true,
    });
  });
});
