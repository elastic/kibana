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
import { installDiscoveryAwareAddAction } from './monkey_patch_add_action';

const discoveryHandleMock = (): HotkeyHandle => ({
  id: 'mock-discovery-handle',
  update: jest.fn(),
  unregister: jest.fn(),
});

describe('installDiscoveryAwareAddAction', () => {
  const createEditorStub = () => {
    const disposables: Array<{ dispose: () => void }> = [];

    const originalAddAction = jest.fn((_descriptor: monaco.editor.IActionDescriptor) => {
      const innerDispose = jest.fn();
      disposables.push({ dispose: innerDispose });
      return { dispose: innerDispose };
    });

    const editor = {
      addAction: originalAddAction,
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    return { editor, originalAddAction, disposables };
  };

  it('registers discovery per keybinding and strips meta before Monaco addAction', () => {
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => discoveryHandleMock()
    );
    const { editor, originalAddAction } = createEditorStub();

    const teardown = installDiscoveryAwareAddAction(editor, { registerForDiscovery });

    editor.addAction({
      id: 'test-action',
      label: 'Test',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
      ],
      run: jest.fn(),
      hotkeysDiscovery: {
        id: 'feat:test',
        label: 'Test discovery label',
        featureId: 'test:feature',
      },
    });

    expect(originalAddAction).toHaveBeenCalledTimes(1);
    const passedDescriptor = originalAddAction.mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect('hotkeysDiscovery' in passedDescriptor).toBe(false);

    expect(registerForDiscovery).toHaveBeenCalledTimes(2);
    expect(registerForDiscovery.mock.calls[0][0].id).toBe('feat:test:binding0');
    expect(registerForDiscovery.mock.calls[1][0].id).toBe('feat:test:binding1');

    teardown();
  });

  it('uses a single discovery id when there is one keybinding', () => {
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => discoveryHandleMock()
    );
    const { editor } = createEditorStub();

    installDiscoveryAwareAddAction(editor, { registerForDiscovery });

    editor.addAction({
      id: 'test-action',
      label: 'Test',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: jest.fn(),
      hotkeysDiscovery: {
        id: 'feat:single',
        label: 'Single',
      },
    });

    expect(registerForDiscovery).toHaveBeenCalledTimes(1);
    expect(registerForDiscovery.mock.calls[0][0].id).toBe('feat:single');
  });

  it('composite dispose unregisters discovery then inner disposable', () => {
    const unregister = jest.fn();
    const registerForDiscovery = jest.fn(
      (_def: HotkeyDefinition): HotkeyHandle => ({
        id: 'h',
        update: jest.fn(),
        unregister,
      })
    );
    const innerDispose = jest.fn();
    const originalAddAction = jest.fn(() => ({
      dispose: innerDispose,
    }));

    const editor = {
      addAction: originalAddAction,
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    installDiscoveryAwareAddAction(editor, { registerForDiscovery });

    const composite = editor.addAction({
      id: 'x',
      label: 'X',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: jest.fn(),
      hotkeysDiscovery: { id: 'feat:x', label: 'X' },
    });

    composite.dispose();

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(innerDispose).toHaveBeenCalledTimes(1);
  });

  it('no-ops when hotkeys is omitted', () => {
    const { editor, originalAddAction } = createEditorStub();
    const teardown = installDiscoveryAwareAddAction(editor);

    teardown();
    expect(editor.addAction).toBe(originalAddAction);
  });

  it('reinstalls Monaco action when allowUserRebinding and onEffectiveBindingChange fires', () => {
    let onEffectiveBindingChange: HotkeyDefinition['onEffectiveBindingChange'];
    const registerForDiscovery = jest.fn((def: HotkeyDefinition): HotkeyHandle => {
      onEffectiveBindingChange = def.onEffectiveBindingChange;
      return discoveryHandleMock();
    });
    const { editor, originalAddAction } = createEditorStub();

    installDiscoveryAwareAddAction(editor, { registerForDiscovery });

    editor.addAction({
      id: 'rebind-action',
      label: 'Rebind',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: jest.fn(),
      hotkeysDiscovery: {
        id: 'feat:rebind',
        label: 'Rebind discovery',
        allowUserRebinding: true,
      },
    });

    expect(typeof onEffectiveBindingChange).toBe('function');
    expect(originalAddAction).toHaveBeenCalledTimes(1);

    onEffectiveBindingChange!('Mod+Shift+P');

    expect(originalAddAction).toHaveBeenCalledTimes(2);
    const secondDescriptor = originalAddAction.mock.calls[1][0] as monaco.editor.IActionDescriptor;
    expect(secondDescriptor.keybindings?.[0]).toBe(mapHotkeyChordToMonacoKeybinding('Mod+Shift+P'));
  });
});
