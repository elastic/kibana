/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import {
  ESQLVariableType,
  QuerySource,
  type ESQLControlsContext,
  ControlTriggerSource,
  type ESQLControlVariable,
} from '@kbn/esql-types';
import type { CoreStart } from '@kbn/core/public';
import type { ESQLEditorDeps } from './types';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';

export interface MonacoCommandDependencies {
  application?: CoreStart['application'];
  uiActions: ESQLEditorDeps['uiActions'];
  telemetryService: ESQLEditorTelemetryService;
  editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor>;
  getCurrentQuery: () => string;
  esqlVariables: React.RefObject<ESQLControlVariable[] | undefined>;
  controlsContext: React.RefObject<ESQLControlsContext | undefined>;
  openTimePickerPopover: () => void;
}

const triggerControl = async (
  queryString: string,
  variableType: ESQLVariableType,
  position: monaco.Position | null | undefined,
  uiActions: ESQLEditorDeps['uiActions'],
  triggerSource: ControlTriggerSource,
  esqlVariables?: ESQLControlVariable[],
  onSaveControl?: ESQLControlsContext['onSaveControl'],
  onCancelControl?: ESQLControlsContext['onCancelControl']
) => {
  await uiActions.getTrigger('ESQL_CONTROL_TRIGGER').exec({
    queryString,
    variableType,
    cursorPosition: position,
    triggerSource,
    esqlVariables,
    onSaveControl,
    onCancelControl,
  });
};

export const registerCustomCommands = (deps: MonacoCommandDependencies): monaco.IDisposable[] => {
  const {
    application,
    uiActions,
    telemetryService,
    editorRef,
    getCurrentQuery,
    esqlVariables,
    controlsContext,
    openTimePickerPopover,
  } = deps;

  const commandDisposables: monaco.IDisposable[] = [];

  // Command to redirect users to the index management page
  commandDisposables.push(
    monaco.editor.registerCommand('esql.policies.create', (...args) => {
      application?.navigateToApp('management', {
        path: 'data/index_management/enrich_policies/create',
        openInNewTab: true,
      });
    })
  );

  // Choose timepicker command
  commandDisposables.push(
    monaco.editor.registerCommand('esql.timepicker.choose', (...args) => {
      openTimePickerPopover();
    })
  );

  // Accept recommended query command
  commandDisposables.push(
    monaco.editor.registerCommand('esql.recommendedQuery.accept', (...args) => {
      const [, { queryLabel }] = args;
      telemetryService.trackRecommendedQueryClicked(QuerySource.AUTOCOMPLETE, queryLabel);
    })
  );

  // Execute multiple commands
  // The payload is expected to be of the form:
  // {
  //   commands: JSON.stringify([
  //     { id: 'commandId1', payload: { ... } },
  //     { id: 'commandId2', payload: { ... } },
  //     ...
  //   ])
  // }
  commandDisposables.push(
    monaco.editor.registerCommand('esql.multiCommands', (...args) => {
      const [, { commands }] = args;
      const commandsToExecute: { id: string; payload?: unknown }[] = JSON.parse(commands);
      commandsToExecute.forEach((command) => {
        editorRef.current?.trigger(undefined, command.id, command.payload ?? {});
      });
    })
  );

  // ESQL Control creation commands
  const controlCommands = [
    {
      command: 'esql.control.multi_values.create',
      variableType: ESQLVariableType.MULTI_VALUES,
    },
    {
      command: 'esql.control.time_literal.create',
      variableType: ESQLVariableType.TIME_LITERAL,
    },
    {
      command: 'esql.control.fields.create',
      variableType: ESQLVariableType.FIELDS,
    },
    {
      command: 'esql.control.values.create',
      variableType: ESQLVariableType.VALUES,
    },
    {
      command: 'esql.control.functions.create',
      variableType: ESQLVariableType.FUNCTIONS,
    },
  ];

  controlCommands.forEach(({ command, variableType }) => {
    commandDisposables.push(
      monaco.editor.registerCommand(command, async (...args) => {
        const [, { triggerSource }] = args;
        const prefilled = triggerSource !== ControlTriggerSource.QUESTION_MARK;
        const currentQuery = getCurrentQuery();
        telemetryService.trackEsqlControlFlyoutOpened(
          prefilled,
          variableType,
          triggerSource,
          currentQuery
        );
        const position = editorRef.current?.getPosition();
        await triggerControl(
          currentQuery,
          variableType,
          position,
          uiActions,
          triggerSource,
          esqlVariables.current ?? undefined,
          controlsContext.current?.onSaveControl,
          controlsContext.current?.onCancelControl
        );
      })
    );
  });

  return commandDisposables;
};

export const addEditorKeyBindings = (
  editor: monaco.editor.IStandaloneCodeEditor,
  onQuerySubmit: (source: QuerySource) => void,
  toggleVisor: () => void,
  onPrettifyQuery: () => void
) => {
  // Add editor key bindings
  editor.addCommand(
    // eslint-disable-next-line no-bitwise
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    () => onQuerySubmit(QuerySource.MANUAL)
  );

  editor.addCommand(
    // eslint-disable-next-line no-bitwise
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
    () => toggleVisor()
  );

  editor.addCommand(
    // eslint-disable-next-line no-bitwise
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
    () => {
      onPrettifyQuery();
    }
  );
};

export const addTabKeybindingRules = () => {
  // When both inline and suggestion widget are visible,
  // we want Tab to accept inline suggestions,
  // so we need to unbind the default suggestion widget behavior
  monaco.editor.addKeybindingRule({
    keybinding: monaco.KeyCode.Tab,
    command: '-acceptSelectedSuggestion',
    when: 'suggestWidgetHasFocusedSuggestion && suggestWidgetVisible && textInputFocus && inlineSuggestionVisible',
  });

  // Add explicit binding for Tab to accept inline suggestions when they're visible
  monaco.editor.addKeybindingRule({
    keybinding: monaco.KeyCode.Tab,
    command: 'editor.action.inlineSuggest.commit',
    when: 'inlineSuggestionVisible && textInputFocus',
  });
};
