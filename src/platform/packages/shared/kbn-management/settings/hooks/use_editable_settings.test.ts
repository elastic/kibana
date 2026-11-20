/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { useEditableSettings } from './use_editable_settings';

type RawSettings = ReturnType<IUiSettingsClient['getAll']>;

const STRING_SETTING = 'test:string';
const RELOAD_SETTING = 'test:reload';
const UNTRACKED_SETTING = 'test:untracked';

const createRawSettings = (stringValue = 'saved'): RawSettings => ({
  [STRING_SETTING]: {
    name: 'String setting',
    type: 'string',
    value: 'default',
    userValue: stringValue,
  },
  [RELOAD_SETTING]: {
    name: 'Reload setting',
    type: 'boolean',
    value: false,
    requiresPageReload: true,
  },
  [UNTRACKED_SETTING]: { name: 'Untracked setting', type: 'string', value: 'other' },
});

const setup = (settingsKeys: string[] = [STRING_SETTING, RELOAD_SETTING]) => {
  const settingsClient = uiSettingsServiceMock.createStartContract();
  const update$ = new Subject<{ key: string; newValue: unknown; oldValue: unknown }>();
  const updateErrors$ = new Subject<Error>();

  settingsClient.getAll.mockReturnValue(createRawSettings());
  settingsClient.isCustom.mockReturnValue(false);
  settingsClient.isOverridden.mockReturnValue(false);
  settingsClient.getUpdate$.mockReturnValue(update$);
  settingsClient.getUpdateErrors$.mockReturnValue(updateErrors$);
  settingsClient.set.mockResolvedValue(true);

  const rendered = renderHook(
    (keys: string[]) => useEditableSettings({ settingsKeys: keys, settingsClient }),
    {
      initialProps: settingsKeys,
    }
  );

  return { ...rendered, settingsClient, update$, updateErrors$ };
};

describe('useEditableSettings', () => {
  it('returns field definitions for the requested, registered settings only', () => {
    const { result } = setup([STRING_SETTING, 'test:unregistered']);

    expect(Object.keys(result.current.fields)).toEqual([STRING_SETTING]);
    expect(result.current.fields[STRING_SETTING]).toMatchObject({
      id: STRING_SETTING,
      name: 'String setting',
      savedValue: 'saved',
      defaultValue: 'default',
    });
  });

  it('keeps the same fields when re-rendered with an equal keys array', () => {
    const { result, rerender, settingsClient } = setup();
    const { fields } = result.current;
    const getAllCalls = settingsClient.getAll.mock.calls.length;

    rerender([STRING_SETTING, RELOAD_SETTING]);

    expect(result.current.fields).toBe(fields);
    expect(settingsClient.getAll).toHaveBeenCalledTimes(getAllCalls);
  });

  it('reads the settings once on mount', () => {
    const { settingsClient } = setup();

    expect(settingsClient.getAll).toHaveBeenCalledTimes(1);
  });

  it('has fields for added keys, and none for removed keys, in the render that changes them', () => {
    const { settingsClient } = setup();
    const renderedFieldKeys: string[][] = [];
    const { rerender } = renderHook(
      (keys: string[]) => {
        const editable = useEditableSettings({ settingsKeys: keys, settingsClient });
        renderedFieldKeys.push(Object.keys(editable.fields));
        return editable;
      },
      { initialProps: [STRING_SETTING] }
    );
    renderedFieldKeys.length = 0;

    rerender([RELOAD_SETTING]);

    expect(renderedFieldKeys).toEqual([[RELOAD_SETTING]]);
  });

  it('refreshes fields when a tracked setting is updated', () => {
    const { result, settingsClient, update$ } = setup();

    settingsClient.getAll.mockReturnValue(createRawSettings('updated'));
    act(() => {
      update$.next({ key: STRING_SETTING, newValue: 'updated', oldValue: 'saved' });
    });

    expect(result.current.fields[STRING_SETTING].savedValue).toBe('updated');
  });

  it('ignores updates to untracked settings', () => {
    const { result, settingsClient, update$ } = setup();
    const { fields } = result.current;

    settingsClient.getAll.mockReturnValue(createRawSettings('updated'));
    act(() => {
      update$.next({ key: UNTRACKED_SETTING, newValue: 'x', oldValue: 'other' });
    });

    expect(result.current.fields).toBe(fields);
  });

  it('adds, removes, and clears unsaved changes', () => {
    const { result } = setup();

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });
    expect(result.current.unsavedChanges).toEqual({
      [STRING_SETTING]: { type: 'string', unsavedValue: 'a' },
      [RELOAD_SETTING]: { type: 'boolean', unsavedValue: true },
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING);
    });
    expect(result.current.unsavedChanges).toEqual({
      [RELOAD_SETTING]: { type: 'boolean', unsavedValue: true },
    });

    act(() => {
      result.current.cleanUnsavedChanges();
    });
    expect(result.current.unsavedChanges).toEqual({});
  });

  it('saves each unsaved change, clears them, and reports that no reload is required', async () => {
    const { result, settingsClient } = setup();

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
    });

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveAll();
    });

    expect(settingsClient.set).toHaveBeenCalledTimes(1);
    expect(settingsClient.set).toHaveBeenCalledWith(STRING_SETTING, 'a');
    expect(saveResult).toEqual({ requiresReload: false });
    expect(result.current.unsavedChanges).toEqual({});
    expect(result.current.isSaving).toBe(false);
  });

  it('reports that a reload is required when a saved setting requires one', async () => {
    const { result } = setup();

    act(() => {
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: true });
    });
  });

  it('does not expose or save changes to keys that are no longer tracked', async () => {
    const { result, rerender, settingsClient } = setup();

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });
    rerender([STRING_SETTING]);

    expect(result.current.unsavedChanges).toEqual({
      [STRING_SETTING]: { type: 'string', unsavedValue: 'a' },
    });

    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveAll();
    });

    expect(settingsClient.set).toHaveBeenCalledTimes(1);
    expect(settingsClient.set).toHaveBeenCalledWith(STRING_SETTING, 'a');
    expect(saveResult).toEqual({ requiresReload: false });
  });

  it('does not call the client when there are no unsaved changes', async () => {
    const { result, settingsClient } = setup();

    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: false });
    });

    expect(settingsClient.set).not.toHaveBeenCalled();
  });

  it('is saving while the client is updating settings', async () => {
    const { result, settingsClient } = setup();
    let resolveSet: (value: boolean) => void = () => {};
    settingsClient.set.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSet = resolve;
      })
    );

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
    });

    let savePromise: Promise<unknown> = Promise.resolve();
    act(() => {
      savePromise = result.current.saveAll();
    });
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      resolveSet(true);
      await savePromise;
    });
    expect(result.current.isSaving).toBe(false);
  });

  it('rejects with the combined messages when updates fail', async () => {
    const { result, settingsClient, updateErrors$ } = setup();
    settingsClient.set.mockImplementation(async (key: string) => {
      updateErrors$.next(new Error(`Unable to save ${key}`));
      return false;
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).rejects.toThrow(
        `Unable to save ${STRING_SETTING}; Unable to save ${RELOAD_SETTING}`
      );
    });
    expect(result.current.isSaving).toBe(false);
  });

  it('reports a request error once when several keys fail with the same error', async () => {
    const { result, settingsClient, updateErrors$ } = setup();
    const requestError = new Error('Request failed with status code: 500');
    settingsClient.set.mockImplementation(async () => {
      updateErrors$.next(requestError);
      return false;
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).rejects.toThrow(
        new Error('Request failed with status code: 500')
      );
    });
  });

  it('names the settings that failed to save when the client reports no error', async () => {
    const { result, settingsClient } = setup();
    settingsClient.set.mockResolvedValue(false);

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).rejects.toThrow(
        new Error('Unable to save "String setting"; Unable to save "Reload setting"')
      );
    });
  });

  it('keeps failed changes unsaved and clears the ones that saved', async () => {
    const { result, settingsClient, updateErrors$ } = setup();
    settingsClient.set.mockImplementation(async (key: string) => {
      if (key === STRING_SETTING) {
        updateErrors$.next(new Error('Bad request'));
        return false;
      }
      return true;
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).rejects.toThrow('Bad request');
    });
    expect(result.current.unsavedChanges).toEqual({
      [STRING_SETTING]: { type: 'string', unsavedValue: 'a' },
    });
  });

  it('reports a reload on the retry when a reload-required change saved in a failed save', async () => {
    const { result, settingsClient, updateErrors$ } = setup();
    settingsClient.set.mockImplementation(async (key: string) => {
      if (key === STRING_SETTING) {
        updateErrors$.next(new Error('Bad request'));
        return false;
      }
      return true;
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });
    await act(async () => {
      await expect(result.current.saveAll()).rejects.toThrow('Bad request');
    });

    settingsClient.set.mockResolvedValue(true);
    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: true });
    });
    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: false });
    });
  });

  it('saves the other changes when the client rejects one of them', async () => {
    const { result, settingsClient } = setup();
    settingsClient.set.mockImplementation(async (key: string) => {
      if (key === STRING_SETTING) {
        throw new Error(`Unable to update "${key}" because its value is overridden`);
      }
      return true;
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).rejects.toThrow(
        `Unable to update "${STRING_SETTING}" because its value is overridden`
      );
    });
    expect(settingsClient.set).toHaveBeenCalledWith(RELOAD_SETTING, true);
    expect(result.current.unsavedChanges).toEqual({
      [STRING_SETTING]: { type: 'string', unsavedValue: 'a' },
    });
    expect(result.current.isSaving).toBe(false);
  });

  it('resolves when an unrelated update fails during the save', async () => {
    const { result, settingsClient, updateErrors$ } = setup();
    settingsClient.set.mockImplementation(async () => {
      updateErrors$.next(new Error('Unable to save theme:darkMode'));
      return true;
    });

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
    });

    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: false });
    });
    expect(result.current.unsavedChanges).toEqual({});
  });

  it('keeps a change made while the save was in flight', async () => {
    const { result, settingsClient } = setup();
    let resolveSet: (value: boolean) => void = () => {};
    settingsClient.set.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveSet = resolve;
      })
    );

    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'a' });
    });

    let savePromise: Promise<unknown> = Promise.resolve();
    act(() => {
      savePromise = result.current.saveAll();
    });
    act(() => {
      result.current.handleFieldChange(STRING_SETTING, { type: 'string', unsavedValue: 'b' });
    });

    await act(async () => {
      resolveSet(true);
      await savePromise;
    });
    expect(result.current.unsavedChanges).toEqual({
      [STRING_SETTING]: { type: 'string', unsavedValue: 'b' },
    });
  });

  it('unsubscribes from setting updates on unmount', () => {
    const { unmount, update$ } = setup();

    expect(update$.observed).toBe(true);
    unmount();
    expect(update$.observed).toBe(false);
  });
});
