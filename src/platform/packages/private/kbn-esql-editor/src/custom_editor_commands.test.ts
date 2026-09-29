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

import { monaco } from '@kbn/code-editor';
import { ESQL_APPLY_TEXT_REPLACEMENT_COMMAND } from '@kbn/esql-language';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { ESQLVariableType, ControlTriggerSource } from '@kbn/esql-types';
import {
  registerCustomCommands,
  addEditorKeyBindings,
  type MonacoCommandDependencies,
} from './custom_editor_commands';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';
import { ESQL_CONTROL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';

const mockModel = {
  getValue: vi.fn(),
  getPositionAt: vi.fn(),
};

const mockEditor = {
  addCommand: vi.fn(),
  addAction: vi.fn(() => ({ dispose: vi.fn() })),
  getPosition: vi.fn(),
  getValue: vi.fn(),
  getModel: vi.fn(() => mockModel),
  executeEdits: vi.fn(),
  setPosition: vi.fn(),
  focus: vi.fn(),
  trigger: vi.fn(),
} as unknown as monaco.editor.IStandaloneCodeEditor;

const mockUiActions = {
  ...uiActionsPluginMock.createStartContract(),
};

const mockTelemetryService = {
  trackEsqlControlFlyoutOpened: vi.fn(),
  trackRecommendedQueryClicked: vi.fn(),
} as unknown as ESQLEditorTelemetryService;

describe('Custom Editor Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockModel.getValue.mockReturnValue('');
    mockModel.getPositionAt.mockReturnValue({ lineNumber: 1, column: 1 });
    // Mock monaco.editor.registerCommand to return a disposable
    vi.spyOn(monaco.editor, 'registerCommand').mockReturnValue({
      dispose: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerCustomCommands', () => {
    it('should use current ref values for esqlVariables and controlsContext when command is executed', async () => {
      const initialVariables = [{ key: 'var1', type: ESQLVariableType.VALUES, value: 'initial' }];
      const updatedVariables = [{ key: 'var2', type: ESQLVariableType.VALUES, value: 'updated' }];

      const initialContext = {
        onSaveControl: vi.fn(),
        onCancelControl: vi.fn(),
        supportsControls: false,
      };
      const updatedContext = {
        onSaveControl: vi.fn(),
        onCancelControl: vi.fn(),
        supportsControls: true,
      };

      // Create refs
      const esqlVariablesRef = { current: initialVariables };
      const controlsContextRef = { current: initialContext };
      const editorRef = { current: mockEditor };

      const deps = {
        application: coreMock.createStart().application,
        uiActions: mockUiActions,
        telemetryService: mockTelemetryService,
        editorRef,
        getCurrentQuery: vi.fn().mockReturnValue('FROM index'),
        esqlVariables: esqlVariablesRef,
        controlsContext: controlsContextRef,
        openTimePickerPopover: vi.fn(),
      } as unknown as MonacoCommandDependencies;

      registerCustomCommands(deps);

      const registerCommandCalls = (monaco.editor.registerCommand as Mock).mock.calls;
      const controlCommandCall = registerCommandCalls.find(
        ([commandId]) => commandId === 'esql.control.values.create'
      );
      expect(controlCommandCall).toBeDefined();

      const commandHandler = controlCommandCall[1];

      // Simulate state changes
      esqlVariablesRef.current = updatedVariables;
      controlsContextRef.current = updatedContext;

      await commandHandler(null, { triggerSource: ControlTriggerSource.ADD_CONTROL_BTN });

      expect(mockUiActions.executeTriggerActions).toHaveBeenCalledWith(
        ESQL_CONTROL_TRIGGER,
        expect.objectContaining({
          esqlVariables: updatedVariables,
          onSaveControl: updatedContext.onSaveControl,
          onCancelControl: updatedContext.onCancelControl,
        })
      );
    });

    it('should use getCurrentQuery function that accesses current editor state', async () => {
      const getCurrentQuery = vi.fn().mockReturnValue('FROM updated_index');
      const esqlVariablesRef = { current: [] };
      const controlsContextRef = { current: null };
      const editorRef = { current: mockEditor };

      const deps = {
        application: coreMock.createStart().application,
        uiActions: mockUiActions,
        telemetryService: mockTelemetryService,
        editorRef,
        getCurrentQuery,
        esqlVariables: esqlVariablesRef,
        controlsContext: controlsContextRef,
        openTimePickerPopover: vi.fn(),
      } as unknown as MonacoCommandDependencies;

      registerCustomCommands(deps);

      const registerCommandCalls = (monaco.editor.registerCommand as Mock).mock.calls;
      const controlCommandCall = registerCommandCalls.find(
        ([commandId]) => commandId === 'esql.control.values.create'
      );
      const commandHandler = controlCommandCall[1];

      await commandHandler(null, { triggerSource: ControlTriggerSource.ADD_CONTROL_BTN });

      expect(getCurrentQuery).toHaveBeenCalled();
      expect(mockTelemetryService.trackEsqlControlFlyoutOpened).toHaveBeenCalledWith(
        true,
        ESQLVariableType.VALUES,
        ControlTriggerSource.ADD_CONTROL_BTN,
        'FROM updated_index'
      );
    });

    it('applies text replacement commands with absolute offsets', () => {
      mockModel.getValue.mockReturnValue('ROW a = 1\nFROM my_timeseries_index');
      mockModel.getPositionAt
        .mockReturnValueOnce({ lineNumber: 2, column: 1 })
        .mockReturnValueOnce({ lineNumber: 2, column: 25 })
        .mockReturnValueOnce({ lineNumber: 2, column: 23 });

      const deps = {
        application: coreMock.createStart().application,
        uiActions: mockUiActions,
        telemetryService: mockTelemetryService,
        editorRef: { current: mockEditor },
        getCurrentQuery: vi.fn(),
        esqlVariables: { current: [] },
        controlsContext: { current: null },
        openTimePickerPopover: vi.fn(),
      } as unknown as MonacoCommandDependencies;

      registerCustomCommands(deps);

      const registerCommandCalls = (monaco.editor.registerCommand as Mock).mock.calls;
      const acceptCommandCall = registerCommandCalls.find(
        ([commandId]) => commandId === ESQL_APPLY_TEXT_REPLACEMENT_COMMAND
      );
      const commandHandler = acceptCommandCall[1];

      commandHandler(null, {
        replacementText: 'TS my_timeseries_index',
        replaceStart: '10',
        replaceEnd: '34',
      });

      expect(mockEditor.executeEdits).toHaveBeenCalledWith('applyTextReplacement', [
        {
          range: new monaco.Range(2, 1, 2, 25),
          text: 'TS my_timeseries_index',
        },
      ]);
      expect(mockEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 2,
        column: 23,
      });
    });
  });

  describe('addEditorKeyBindings', () => {
    const findAction = (keybinding: number) =>
      (mockEditor.addAction as Mock).mock.calls.find(([action]) =>
        action.keybindings.includes(keybinding)
      )?.[0];

    // Registered as actions so the keybindings stay scoped to this editor instead of firing while
    // another editor on the page has focus.
    it('registers scoped actions rather than page-wide commands', () => {
      addEditorKeyBindings(mockEditor, vi.fn(), vi.fn(), vi.fn());

      expect(mockEditor.addAction).toHaveBeenCalledTimes(4);
      expect(mockEditor.addCommand).not.toHaveBeenCalled();
    });

    it('returns a disposable per registered action', () => {
      const disposables = addEditorKeyBindings(mockEditor, vi.fn(), vi.fn(), vi.fn());

      expect(disposables).toHaveLength(4);
      disposables.forEach((disposable) => expect(typeof disposable.dispose).toBe('function'));
    });

    it('registers the generate-from-comment action only when the callback is supplied', () => {
      addEditorKeyBindings(mockEditor, vi.fn(), vi.fn(), vi.fn(), vi.fn());

      expect(mockEditor.addAction).toHaveBeenCalledTimes(5);
      // eslint-disable-next-line no-bitwise
      expect(findAction(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ)).toBeDefined();
    });

    it('calls toggleVisor on CMD+K', () => {
      const mockToggleVisor = vi.fn();
      addEditorKeyBindings(mockEditor, vi.fn(), mockToggleVisor, vi.fn());

      // eslint-disable-next-line no-bitwise
      findAction(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK).run();

      expect(mockToggleVisor).toHaveBeenCalledTimes(1);
    });

    it('calls onQuerySubmit on CMD+Enter when query is non-empty', () => {
      const mockOnQuerySubmit = vi.fn();
      (mockEditor.getValue as Mock).mockReturnValue('FROM logs');
      addEditorKeyBindings(mockEditor, mockOnQuerySubmit, vi.fn(), vi.fn());

      // eslint-disable-next-line no-bitwise
      findAction(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter).run();

      expect(mockOnQuerySubmit).toHaveBeenCalledWith('manual');
    });

    it('does not call onQuerySubmit on CMD+Enter when query is empty', () => {
      const mockOnQuerySubmit = vi.fn();
      (mockEditor.getValue as Mock).mockReturnValue('   ');
      addEditorKeyBindings(mockEditor, mockOnQuerySubmit, vi.fn(), vi.fn());

      // eslint-disable-next-line no-bitwise
      findAction(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter).run();

      expect(mockOnQuerySubmit).not.toHaveBeenCalled();
    });

    it('calls onPrettifyQuery on CMD+I', () => {
      const mockOnPrettifyQuery = vi.fn();
      addEditorKeyBindings(mockEditor, vi.fn(), vi.fn(), mockOnPrettifyQuery);

      // eslint-disable-next-line no-bitwise
      findAction(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI).run();

      expect(mockOnPrettifyQuery).toHaveBeenCalledTimes(1);
    });

    it('inserts a newline on Shift+Enter', () => {
      addEditorKeyBindings(mockEditor, vi.fn(), vi.fn(), vi.fn());

      // The action receives the focused editor, so the newline lands there rather than in a
      // closed-over reference to this one.
      // eslint-disable-next-line no-bitwise
      findAction(monaco.KeyMod.Shift | monaco.KeyCode.Enter).run(mockEditor);

      expect(mockEditor.trigger).toHaveBeenCalledWith('keyboard', 'type', { text: '\n' });
    });
  });
});
