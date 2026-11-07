/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { Subject } from 'rxjs';
import type {
  IUiSettingsClient,
  IUiSettingsMetadataClient,
  UiSettingsMetadataState,
} from '@kbn/core-ui-settings-browser';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { useEditableSettings } from './use_editable_settings';

type RawSettings = ReturnType<IUiSettingsClient['getAll']>;

const STRING_SETTING = 'test:string';
const RELOAD_SETTING = 'test:reload';
const UNTRACKED_SETTING = 'test:untracked';

const definitions: UiSettingsMetadataState = {
  [STRING_SETTING]: {
    name: 'String setting',
    description: 'A string setting',
    type: 'string',
    value: 'default',
  },
  [RELOAD_SETTING]: {
    name: 'Reload setting',
    type: 'boolean',
    value: false,
    requiresPageReload: true,
  },
  [UNTRACKED_SETTING]: { name: 'Untracked setting', type: 'string', value: 'other' },
};

const createRawSettings = (stringValue = 'saved'): RawSettings => ({
  [STRING_SETTING]: {
    name: 'String setting',
    type: 'string',
    value: 'default',
    userValue: stringValue,
  },
  [RELOAD_SETTING]: { name: 'Reload setting', type: 'boolean', value: false },
  [UNTRACKED_SETTING]: { name: 'Untracked setting', type: 'string', value: 'other' },
});

const createClients = () => {
  const settingsClient = uiSettingsServiceMock.createStartContract();
  const update$ = new Subject<{ key: string; newValue: unknown; oldValue: unknown }>();
  const updateErrors$ = new Subject<Error>();

  settingsClient.getAll.mockReturnValue(createRawSettings());
  settingsClient.isCustom.mockReturnValue(false);
  settingsClient.isOverridden.mockReturnValue(false);
  settingsClient.getUpdate$.mockReturnValue(update$);
  settingsClient.getUpdateErrors$.mockReturnValue(updateErrors$);
  settingsClient.set.mockResolvedValue(true);

  const metadataClient: jest.Mocked<IUiSettingsMetadataClient> = {
    getAll: jest.fn().mockResolvedValue(definitions),
  };

  return { settingsClient, metadataClient, update$, updateErrors$ };
};

const renderEditableSettings = (
  settingsKeys: string[] = [STRING_SETTING, RELOAD_SETTING],
  clients = createClients()
) => {
  const { settingsClient, metadataClient } = clients;
  const rendered = renderHook(
    (keys: string[]) =>
      useEditableSettings({
        settingsKeys: keys,
        settingsClient,
        metadataClient,
        scope: 'namespace',
      }),
    {
      initialProps: settingsKeys,
    }
  );

  return { ...rendered, ...clients };
};

const setup = async (settingsKeys?: string[]) => {
  const rendered = renderEditableSettings(settingsKeys);
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered;
};

describe('useEditableSettings', () => {
  it('returns field definitions for the requested, registered settings only', async () => {
    const { result } = await setup([STRING_SETTING, 'test:unregistered']);

    expect(Object.keys(result.current.fields)).toEqual([STRING_SETTING]);
    expect(result.current.fields[STRING_SETTING]).toMatchObject({
      id: STRING_SETTING,
      name: 'String setting',
      savedValue: 'saved',
      defaultValue: 'default',
    });
  });

  it('keeps the same fields when re-rendered with an equal keys array', async () => {
    const { result, rerender, settingsClient } = await setup();
    const { fields } = result.current;
    const getAllCalls = settingsClient.getAll.mock.calls.length;

    rerender([STRING_SETTING, RELOAD_SETTING]);

    expect(result.current.fields).toBe(fields);
    expect(settingsClient.getAll).toHaveBeenCalledTimes(getAllCalls);
  });

  it('reads the settings once on mount', async () => {
    const { settingsClient } = await setup();

    expect(settingsClient.getAll).toHaveBeenCalledTimes(1);
  });

  it('has fields for added keys, and none for removed keys, in the render that changes them', async () => {
    const { settingsClient, metadataClient } = createClients();
    const renderedFieldKeys: string[][] = [];
    const { result, rerender } = renderHook(
      (keys: string[]) => {
        const editable = useEditableSettings({
          settingsKeys: keys,
          settingsClient,
          metadataClient,
          scope: 'namespace',
        });
        renderedFieldKeys.push(Object.keys(editable.fields));
        return editable;
      },
      { initialProps: [STRING_SETTING] }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    renderedFieldKeys.length = 0;

    rerender([RELOAD_SETTING]);

    expect(renderedFieldKeys).toEqual([[RELOAD_SETTING]]);
  });

  it('refreshes fields when a tracked setting is updated', async () => {
    const { result, settingsClient, update$ } = await setup();

    settingsClient.getAll.mockReturnValue(createRawSettings('updated'));
    act(() => {
      update$.next({ key: STRING_SETTING, newValue: 'updated', oldValue: 'saved' });
    });

    expect(result.current.fields[STRING_SETTING].savedValue).toBe('updated');
  });

  it('ignores updates to untracked settings', async () => {
    const { result, settingsClient, update$ } = await setup();
    const { fields } = result.current;

    settingsClient.getAll.mockReturnValue(createRawSettings('updated'));
    act(() => {
      update$.next({ key: UNTRACKED_SETTING, newValue: 'x', oldValue: 'other' });
    });

    expect(result.current.fields).toBe(fields);
  });

  it('adds, removes, and clears unsaved changes', async () => {
    const { result } = await setup();

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
    const { result, settingsClient } = await setup();

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
    const { result } = await setup();

    act(() => {
      result.current.handleFieldChange(RELOAD_SETTING, { type: 'boolean', unsavedValue: true });
    });

    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: true });
    });
  });

  it('does not expose or save changes to keys that are no longer tracked', async () => {
    const { result, rerender, settingsClient } = await setup();

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
    const { result, settingsClient } = await setup();

    await act(async () => {
      await expect(result.current.saveAll()).resolves.toEqual({ requiresReload: false });
    });

    expect(settingsClient.set).not.toHaveBeenCalled();
  });

  it('is saving while the client is updating settings', async () => {
    const { result, settingsClient } = await setup();
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
    const { result, settingsClient, updateErrors$ } = await setup();
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

  it('keeps failed changes unsaved and clears the ones that saved', async () => {
    const { result, settingsClient, updateErrors$ } = await setup();
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

  it('saves the other changes when the client rejects one of them', async () => {
    const { result, settingsClient } = await setup();
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
    const { result, settingsClient, updateErrors$ } = await setup();
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
    const { result, settingsClient } = await setup();
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

  it('builds fields from the loaded setting definitions and the current values from the client', async () => {
    const { result, metadataClient } = await setup();

    expect(result.current.fields[STRING_SETTING]).toMatchObject({
      displayName: 'String setting',
      description: 'A string setting',
      defaultValue: 'default',
      savedValue: 'saved',
    });
    expect(result.current.fields[RELOAD_SETTING]).toMatchObject({ requiresPageReload: true });
    expect(metadataClient.getAll).toHaveBeenCalledTimes(1);
    expect(metadataClient.getAll).toHaveBeenCalledWith('namespace');
  });

  it('reports loading until the setting definitions have loaded', async () => {
    const { result, settingsClient } = renderEditableSettings();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadError).toBeUndefined();
    expect(result.current.fields).toEqual({});
    expect(settingsClient.getAll).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loadError).toBeUndefined();
    expect(Object.keys(result.current.fields)).toEqual([STRING_SETTING, RELOAD_SETTING]);
  });

  it('exposes the error when the setting definitions fail to load', async () => {
    const clients = createClients();
    clients.metadataClient.getAll.mockRejectedValue(new Error('Request failed'));

    const { result } = renderEditableSettings(undefined, clients);

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.loadError).toEqual(new Error('Request failed')));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fields).toEqual({});
  });

  it('unsubscribes from setting updates on unmount', async () => {
    const { unmount, update$ } = await setup();

    expect(update$.observed).toBe(true);
    unmount();
    expect(update$.observed).toBe(false);
  });
});
