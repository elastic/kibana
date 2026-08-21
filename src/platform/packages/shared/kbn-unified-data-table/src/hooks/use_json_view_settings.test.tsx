/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { createLocalStorageMock } from '../../__mocks__/local_storage_mock';
import {
  useSourceDisplayMode,
  useJsonModeSettings,
  getStoredSourceDisplayMode,
  getStoredJsonModeSettings,
} from './use_json_view_settings';

const SOURCE_DISPLAY_MODE_KEY = 'discover:sourceDisplayMode';
const JSON_MODE_SETTINGS_KEY = 'discover:jsonModeSettings';

describe('useSourceDisplayMode', () => {
  it('defaults to "summary" when neither state nor local storage has a value', () => {
    const storage = createLocalStorageMock({});
    const { result } = renderHook(() => useSourceDisplayMode({ storage, consumer: 'discover' }));
    expect(result.current.sourceDisplayMode).toBe('summary');
  });

  it('defaults to "summary" and ignores local storage when there is no state', () => {
    // Local storage only seeds new authoring contexts, it must not flip an object with no
    // persisted mode to JSON at render time.
    const storage = createLocalStorageMock({ [SOURCE_DISPLAY_MODE_KEY]: 'json' });
    const { result } = renderHook(() => useSourceDisplayMode({ storage, consumer: 'discover' }));
    expect(result.current.sourceDisplayMode).toBe('summary');
  });

  it('uses the per-context state when provided', () => {
    const storage = createLocalStorageMock({});
    const { result } = renderHook(() =>
      useSourceDisplayMode({ storage, consumer: 'discover', sourceDisplayModeState: 'json' })
    );
    expect(result.current.sourceDisplayMode).toBe('json');
  });

  it('writes to local storage and calls onUpdate when changed', () => {
    const storage = createLocalStorageMock({});
    const onUpdateSourceDisplayMode = jest.fn();
    const { result } = renderHook(() =>
      useSourceDisplayMode({ storage, consumer: 'discover', onUpdateSourceDisplayMode })
    );

    result.current.onChangeSourceDisplayMode?.('json');

    expect(storage.get(SOURCE_DISPLAY_MODE_KEY)).toBe('json');
    expect(onUpdateSourceDisplayMode).toHaveBeenCalledWith('json');
  });
});

describe('useJsonModeSettings', () => {
  it('defaults to an empty object when neither state nor local storage has a value', () => {
    const storage = createLocalStorageMock({});
    const { result } = renderHook(() => useJsonModeSettings({ storage, consumer: 'discover' }));
    expect(result.current.jsonModeSettings).toEqual({});
  });

  it('falls back to the local storage value when there is no state', () => {
    // hideNulls/wrapLines are cosmetic prefs (like density), so they remember the viewer's last choice.
    const storage = createLocalStorageMock({
      [JSON_MODE_SETTINGS_KEY]: { hideNulls: true, wrapLines: false },
    });
    const { result } = renderHook(() => useJsonModeSettings({ storage, consumer: 'discover' }));
    expect(result.current.jsonModeSettings).toEqual({ hideNulls: true, wrapLines: false });
  });

  it('prefers the per-context state over the local storage value', () => {
    const storage = createLocalStorageMock({ [JSON_MODE_SETTINGS_KEY]: { hideNulls: true } });
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
    const storage = createLocalStorageMock({});
    const onUpdateJsonModeSettings = jest.fn();
    const { result } = renderHook(() =>
      useJsonModeSettings({ storage, consumer: 'discover', onUpdateJsonModeSettings })
    );

    result.current.onChangeJsonModeSettings?.({ hideNulls: true, wrapLines: false });

    expect(storage.get(JSON_MODE_SETTINGS_KEY)).toEqual({ hideNulls: true, wrapLines: false });
    expect(onUpdateJsonModeSettings).toHaveBeenCalledWith({ hideNulls: true, wrapLines: false });
  });
});

describe('getStoredSourceDisplayMode', () => {
  it('returns the stored mode', () => {
    const storage = createLocalStorageMock({ [SOURCE_DISPLAY_MODE_KEY]: 'json' });
    expect(getStoredSourceDisplayMode(storage, 'discover')).toBe('json');
  });

  it('returns undefined when nothing is stored', () => {
    const storage = createLocalStorageMock({});
    expect(getStoredSourceDisplayMode(storage, 'discover')).toBeUndefined();
  });

  it('returns undefined for an invalid stored value', () => {
    const storage = createLocalStorageMock({ [SOURCE_DISPLAY_MODE_KEY]: 'nonsense' });
    expect(getStoredSourceDisplayMode(storage, 'discover')).toBeUndefined();
  });
});

describe('getStoredJsonModeSettings', () => {
  it('returns the stored settings', () => {
    const storage = createLocalStorageMock({ [JSON_MODE_SETTINGS_KEY]: { hideNulls: true } });
    expect(getStoredJsonModeSettings(storage, 'discover')).toEqual({ hideNulls: true });
  });

  it('returns undefined when nothing is stored', () => {
    const storage = createLocalStorageMock({});
    expect(getStoredJsonModeSettings(storage, 'discover')).toBeUndefined();
  });

  it('returns undefined for a non-object stored value', () => {
    const storage = createLocalStorageMock({ [JSON_MODE_SETTINGS_KEY]: 'nonsense' });
    expect(getStoredJsonModeSettings(storage, 'discover')).toBeUndefined();
  });
});
