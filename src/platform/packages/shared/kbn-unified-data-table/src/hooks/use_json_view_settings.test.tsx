/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { renderHook } from '@testing-library/react';
import { useSourceDisplayMode, useJsonModeSettings } from './use_json_view_settings';

const localStorageMock = {
  get: jest.fn(),
  set: jest.fn(),
};
const storage = localStorageMock as unknown as Storage;

describe('useSourceDisplayMode', () => {
  beforeEach(() => {
    localStorageMock.get.mockReset();
    localStorageMock.set.mockReset();
  });

  it('defaults to "summary" when neither state nor local storage has a value', () => {
    localStorageMock.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useSourceDisplayMode({ storage, consumer: 'discover' }));
    expect(result.current.sourceDisplayMode).toBe('summary');
  });

  it('falls back to the local storage value when there is no state', () => {
    localStorageMock.get.mockReturnValue('json');
    const { result } = renderHook(() => useSourceDisplayMode({ storage, consumer: 'discover' }));
    expect(result.current.sourceDisplayMode).toBe('json');
  });

  it('prefers the per-context state over the local storage value', () => {
    localStorageMock.get.mockReturnValue('json');
    const { result } = renderHook(() =>
      useSourceDisplayMode({ storage, consumer: 'discover', sourceDisplayModeState: 'summary' })
    );
    expect(result.current.sourceDisplayMode).toBe('summary');
  });

  it('writes to local storage and calls onUpdate when changed', () => {
    const onUpdateSourceDisplayMode = jest.fn();
    const { result } = renderHook(() =>
      useSourceDisplayMode({ storage, consumer: 'discover', onUpdateSourceDisplayMode })
    );

    result.current.onChangeSourceDisplayMode?.('json');

    expect(localStorageMock.set).toHaveBeenCalledWith('discover:sourceDisplayMode', 'json');
    expect(onUpdateSourceDisplayMode).toHaveBeenCalledWith('json');
  });
});

describe('useJsonModeSettings', () => {
  beforeEach(() => {
    localStorageMock.get.mockReset();
    localStorageMock.set.mockReset();
  });

  it('defaults to an empty object when neither state nor local storage has a value', () => {
    localStorageMock.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useJsonModeSettings({ storage, consumer: 'discover' }));
    expect(result.current.jsonModeSettings).toEqual({});
  });

  it('falls back to the local storage value when there is no state', () => {
    localStorageMock.get.mockReturnValue({ hideNulls: true, wrapLines: false });
    const { result } = renderHook(() => useJsonModeSettings({ storage, consumer: 'discover' }));
    expect(result.current.jsonModeSettings).toEqual({ hideNulls: true, wrapLines: false });
  });

  it('prefers the per-context state over the local storage value', () => {
    localStorageMock.get.mockReturnValue({ hideNulls: true });
    const { result } = renderHook(() =>
      useJsonModeSettings({
        storage,
        consumer: 'discover',
        jsonModeSettingsState: { wrapLines: false },
      })
    );
    expect(result.current.jsonModeSettings).toEqual({ wrapLines: false });
  });

  it('writes to local storage and calls onUpdate when changed', () => {
    const onUpdateJsonModeSettings = jest.fn();
    const { result } = renderHook(() =>
      useJsonModeSettings({ storage, consumer: 'discover', onUpdateJsonModeSettings })
    );

    result.current.onChangeJsonModeSettings?.({ hideNulls: true, wrapLines: false });

    expect(localStorageMock.set).toHaveBeenCalledWith('discover:jsonModeSettings', {
      hideNulls: true,
      wrapLines: false,
    });
    expect(onUpdateJsonModeSettings).toHaveBeenCalledWith({ hideNulls: true, wrapLines: false });
  });
});
