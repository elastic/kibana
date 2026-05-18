/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-bitwise -- Monaco keybindings */

import '../../../..';

import type { HotkeyDefinition, HotkeyHandle } from '@kbn/core-hotkeys-browser';
import { monaco } from '@kbn/monaco';
import { mapHotkeyChordToMonacoKeybinding } from '../utils';
import { monkeyPatchEditorAddCommandForHotkeysDiscovery } from './monkey_patch_add_command';

const discoveryHandleMock = (): HotkeyHandle => ({
  id: 'mock-discovery-handle',
  update: jest.fn(),
  unregister: jest.fn(),
});

describe('installDiscoveryAwareAddCommand', () => {
  const createEditorStub = () => {
    const disposeMocks: Array<{ dispose: jest.Mock }> = [];
    const addDynamicKeybinding = jest.fn(
      (_cmd: string, _kb: number, _h: unknown, _when: unknown) => {
        const innerDispose = jest.fn();
        disposeMocks.push({ dispose: innerDispose });
        return { dispose: innerDispose };
      }
    );

    const originalAddCommand = jest.fn(() => 'stock-command-id');

    const editor = {
      addCommand: originalAddCommand,
      _standaloneKeybindingService: { addDynamicKeybinding },
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    return { editor, originalAddCommand, addDynamicKeybinding, disposeMocks };
  };

  it('uses stock addCommand when discovery meta is absent', () => {
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => discoveryHandleMock()
    );
    const { editor, originalAddCommand, addDynamicKeybinding } = createEditorStub();
    monkeyPatchEditorAddCommandForHotkeysDiscovery(editor, { registerForDiscovery });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, jest.fn());

    expect(originalAddCommand).toHaveBeenCalledTimes(1);
    expect(addDynamicKeybinding).not.toHaveBeenCalled();
    expect(registerForDiscovery).not.toHaveBeenCalled();
  });

  it('uses dynamic keybindings when allowUserRebinding is true and skips stock addCommand', () => {
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => discoveryHandleMock()
    );
    const { editor, originalAddCommand, addDynamicKeybinding } = createEditorStub();
    monkeyPatchEditorAddCommandForHotkeysDiscovery(editor, { registerForDiscovery });

    const handler = jest.fn();
    const kb = monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter;
    const commandId = editor.addCommand(kb, handler, {
      id: 'feat:dyn',
      label: 'Run',
      allowUserRebinding: true,
    });

    expect(typeof commandId).toBe('string');
    expect(addDynamicKeybinding).toHaveBeenCalledTimes(1);
    expect(originalAddCommand).not.toHaveBeenCalled();
    expect(registerForDiscovery).toHaveBeenCalledTimes(1);
    expect(registerForDiscovery.mock.calls[0][0].onEffectiveBindingChange).toEqual(
      expect.any(Function)
    );
  });

  it('disposes prior dynamic registration when onEffectiveBindingChange fires', () => {
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => discoveryHandleMock()
    );
    const { editor, addDynamicKeybinding, disposeMocks } = createEditorStub();
    monkeyPatchEditorAddCommandForHotkeysDiscovery(editor, { registerForDiscovery });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, jest.fn(), {
      id: 'feat:rebind',
      label: 'Run',
      allowUserRebinding: true,
    });

    const onEffectiveBindingChange =
      registerForDiscovery.mock.calls[0][0].onEffectiveBindingChange!;
    onEffectiveBindingChange('Mod+Shift+Enter');

    expect(disposeMocks[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(addDynamicKeybinding).toHaveBeenCalledTimes(2);
    expect(addDynamicKeybinding.mock.calls[1][1]).toBe(
      mapHotkeyChordToMonacoKeybinding('Mod+Shift+Enter')
    );
  });

  it('falls back to stock addCommand when standalone keybinding service is missing', () => {
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => discoveryHandleMock()
    );
    const originalAddCommand = jest.fn(() => 'stock-command-id');
    const editor = {
      addCommand: originalAddCommand,
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    monkeyPatchEditorAddCommandForHotkeysDiscovery(editor, { registerForDiscovery });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, jest.fn(), {
      id: 'feat:fallback',
      label: 'Run',
      allowUserRebinding: true,
    });

    expect(originalAddCommand).toHaveBeenCalledTimes(1);
    expect(registerForDiscovery).toHaveBeenCalledTimes(1);
    expect(registerForDiscovery.mock.calls[0][0].onEffectiveBindingChange).toBeUndefined();
  });

  it('composite teardown disposes dynamic bindings and unregisters discovery', () => {
    const unregister = jest.fn();
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => ({
        id: 'h',
        update: jest.fn(),
        unregister,
      })
    );
    const { editor, disposeMocks } = createEditorStub();
    const teardown = monkeyPatchEditorAddCommandForHotkeysDiscovery(editor, {
      registerForDiscovery,
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, jest.fn(), {
      id: 'feat:dispose',
      label: 'Palette',
      allowUserRebinding: true,
    });

    teardown();

    expect(disposeMocks[0]?.dispose).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('no-ops teardown when hotkeys is omitted', () => {
    const { editor, originalAddCommand } = createEditorStub();
    const teardown = monkeyPatchEditorAddCommandForHotkeysDiscovery(editor);

    teardown();
    expect(editor.addCommand).toBe(originalAddCommand);
  });
});
