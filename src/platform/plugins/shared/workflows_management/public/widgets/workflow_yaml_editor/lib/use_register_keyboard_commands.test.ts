/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/monaco';
import { useRegisterKeyboardCommands } from './use_register_keyboard_commands';

vi.mock('@kbn/monaco', () => {
      const mocked = {
      monaco: {
        KeyMod: { CtrlCmd: 2048, Shift: 1024 },
        KeyCode: {
          Slash: 85,
          Digit7: 38,
          KeyK: 46,
          KeyS: 54,
          KeyF: 36,
          Enter: 3,
        },
        editor: {
          EditorOption: { readOnly: 81 },
        },
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/i18n', () => {
      const mocked = {
      i18n: {
        translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
      },
    };
      return { ...mocked, default: mocked };
    });

const createMockDisposable = (): monaco.IDisposable => ({
  dispose: vi.fn(),
});

const createMockEditor = (readOnly = false) => {
  const actions: Array<{ id: string; run: (...args: unknown[]) => void }> = [];
  return {
    addAction: vi.fn((action: { id: string; run: (...args: unknown[]) => void }) => {
      actions.push(action);
      return createMockDisposable();
    }),
    getOption: vi.fn(() => readOnly),
    trigger: vi.fn(),
    _actions: actions,
  } as unknown as monaco.editor.IStandaloneCodeEditor & {
    _actions: Array<{ id: string; run: (...args: unknown[]) => void }>;
  };
};

describe('useRegisterKeyboardCommands', () => {
  it('returns registerKeyboardCommands and unregisterKeyboardCommands functions', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());

    expect(typeof result.current.registerKeyboardCommands).toBe('function');
    expect(typeof result.current.unregisterKeyboardCommands).toBe('function');
  });

  it('registers six keyboard actions on the editor', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor();

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save: vi.fn(),
        run: vi.fn(),
        saveAndRun: vi.fn(),
      });
    });

    expect(editor.addAction).toHaveBeenCalledTimes(6);
  });

  it('calls save callback when save action runs on a writable editor', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor(false);
    const save = vi.fn();

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save,
        run: vi.fn(),
        saveAndRun: vi.fn(),
      });
    });

    const saveAction = editor._actions.find((a) => a.id === 'workflows.editor.action.save');
    expect(saveAction).toBeDefined();

    act(() => {
      saveAction!.run(editor);
    });

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('calls run callback when run action is triggered', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor(false);
    const run = vi.fn();

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save: vi.fn(),
        run,
        saveAndRun: vi.fn(),
      });
    });

    const runAction = editor._actions.find((a) => a.id === 'workflows.editor.action.run');
    act(() => {
      runAction!.run(editor);
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('calls saveAndRun callback when save-and-run action is triggered', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor(false);
    const saveAndRun = vi.fn();

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save: vi.fn(),
        run: vi.fn(),
        saveAndRun,
      });
    });

    const saveAndRunAction = editor._actions.find(
      (a) => a.id === 'workflows.editor.action.saveAndRun'
    );
    act(() => {
      saveAndRunAction!.run(editor);
    });

    expect(saveAndRun).toHaveBeenCalledTimes(1);
  });

  it('calls openActionsPopover callback when popover action is triggered', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor(false);
    const openActionsPopover = vi.fn();

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover,
        save: vi.fn(),
        run: vi.fn(),
        saveAndRun: vi.fn(),
      });
    });

    const popoverAction = editor._actions.find(
      (a) => a.id === 'workflows.editor.action.openActionsPopover'
    );
    act(() => {
      popoverAction!.run(editor);
    });

    expect(openActionsPopover).toHaveBeenCalledTimes(1);
  });

  it('does not call callbacks when editor is read-only', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor(true);
    const save = vi.fn();
    const run = vi.fn();

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save,
        run,
        saveAndRun: vi.fn(),
      });
    });

    const saveAction = editor._actions.find((a) => a.id === 'workflows.editor.action.save');
    act(() => {
      saveAction!.run(editor);
    });

    expect(save).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('disposes previous actions when registering new ones', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const disposable1 = createMockDisposable();
    const editor = {
      addAction: vi.fn(() => disposable1),
      getOption: vi.fn(() => false),
      trigger: vi.fn(),
      _actions: [],
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    const params = {
      editor,
      openActionsPopover: vi.fn(),
      save: vi.fn(),
      run: vi.fn(),
      saveAndRun: vi.fn(),
    };

    act(() => {
      result.current.registerKeyboardCommands(params);
    });

    // Register again - should dispose the previous set
    act(() => {
      result.current.registerKeyboardCommands(params);
    });

    expect(disposable1.dispose).toHaveBeenCalledTimes(6);
  });

  it('unregisterKeyboardCommands disposes all actions', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const disposable = createMockDisposable();
    const editor = {
      addAction: vi.fn(() => disposable),
      getOption: vi.fn(() => false),
      trigger: vi.fn(),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save: vi.fn(),
        run: vi.fn(),
        saveAndRun: vi.fn(),
      });
    });

    act(() => {
      result.current.unregisterKeyboardCommands();
    });

    expect(disposable.dispose).toHaveBeenCalledTimes(6);
  });

  it('triggers toggle comment on the editor for the comment action', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const actions: Array<{ id: string; run: (...args: unknown[]) => void }> = [];
    const editor = {
      addAction: vi.fn((action: { id: string; run: (...args: unknown[]) => void }) => {
        actions.push(action);
        return createMockDisposable();
      }),
      getOption: vi.fn(() => false),
      trigger: vi.fn(),
    } as unknown as monaco.editor.IStandaloneCodeEditor;

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save: vi.fn(),
        run: vi.fn(),
        saveAndRun: vi.fn(),
      });
    });

    const commentAction = actions.find(
      (a) => a.id === 'workflows.editor.action.commentLine.toggle'
    );
    expect(commentAction).toBeDefined();

    act(() => {
      commentAction!.run(editor);
    });

    expect(editor.trigger).toHaveBeenCalledWith('keyboard', 'editor.action.commentLine', null);
  });

  it('triggers find replace on the editor for the findAndReplace action', () => {
    const { result } = renderHook(() => useRegisterKeyboardCommands());
    const editor = createMockEditor(false);

    act(() => {
      result.current.registerKeyboardCommands({
        editor,
        openActionsPopover: vi.fn(),
        save: vi.fn(),
        run: vi.fn(),
        saveAndRun: vi.fn(),
      });
    });

    const findAction = editor._actions.find(
      (action) => action.id === 'workflows.editor.action.findAndReplace'
    );
    expect(findAction).toBeDefined();

    act(() => {
      findAction?.run(editor);
    });

    expect(editor.trigger).toHaveBeenCalledWith(
      'keyboard',
      'editor.action.startFindReplaceAction',
      null
    );
  });
});
