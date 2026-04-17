/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

/** Callbacks the keybinding layer invokes into the hook's state. */
export interface KeybindingHandlers {
  accept: () => void;
  selectPrevious: () => void;
  selectNext: () => void;
  pageUp: () => void;
  pageDown: () => void;
  /** Called on Escape. Return true if the Escape was handled (to stop the default exit-edit behavior). */
  onEscape: () => boolean;
}

/**
 * Register the suggest widget's keybindings on the editor. All actions go
 * through `addAction` with `precondition: contextKey` so Monaco's defaults
 * (Enter/Tab type, Escape exit-edit-mode) stay active when the widget is
 * hidden.
 *
 * Escape is handled via `onKeyDown` rather than `addAction`: the shared
 * CodeEditor wrapper listens on `onKeyDown` and exits edit mode on Escape.
 * Our `addAction` fires through a separate pipeline, so the wrapper would
 * run first and `stopPropagation` prevents our handler from firing.
 * Intercepting in `onKeyDown` lets us `preventDefault + stopPropagation`
 * before the wrapper decides to exit edit mode.
 */
export const registerKeybindings = (
  editor: monaco.editor.IStandaloneCodeEditor,
  contextKey: string,
  handlers: KeybindingHandlers
): monaco.IDisposable[] => {
  const disposables: monaco.IDisposable[] = [];
  const addKeyAction = (
    id: string,
    label: string,
    keybindings: number[],
    run: () => void
  ): void => {
    disposables.push(editor.addAction({ id, label, precondition: contextKey, keybindings, run }));
  };

  addKeyAction(
    'customSuggest.accept',
    i18n.translate('workflows.yamlEditor.suggest.accept', {
      defaultMessage: 'Accept suggestion',
    }),
    [monaco.KeyCode.Enter],
    handlers.accept
  );
  addKeyAction(
    'customSuggest.acceptTab',
    i18n.translate('workflows.yamlEditor.suggest.acceptTab', {
      defaultMessage: 'Accept suggestion (Tab)',
    }),
    [monaco.KeyCode.Tab],
    handlers.accept
  );
  addKeyAction(
    'customSuggest.selectPrevious',
    i18n.translate('workflows.yamlEditor.suggest.selectPrevious', {
      defaultMessage: 'Select previous suggestion',
    }),
    [monaco.KeyCode.UpArrow],
    handlers.selectPrevious
  );
  addKeyAction(
    'customSuggest.selectNext',
    i18n.translate('workflows.yamlEditor.suggest.selectNext', {
      defaultMessage: 'Select next suggestion',
    }),
    [monaco.KeyCode.DownArrow],
    handlers.selectNext
  );
  addKeyAction(
    'customSuggest.pageUp',
    i18n.translate('workflows.yamlEditor.suggest.pageUp', {
      defaultMessage: 'Page up in suggestions',
    }),
    [monaco.KeyCode.PageUp],
    handlers.pageUp
  );
  addKeyAction(
    'customSuggest.pageDown',
    i18n.translate('workflows.yamlEditor.suggest.pageDown', {
      defaultMessage: 'Page down in suggestions',
    }),
    [monaco.KeyCode.PageDown],
    handlers.pageDown
  );

  disposables.push(
    editor.onKeyDown((e) => {
      if (e.keyCode !== monaco.KeyCode.Escape) return;
      if (!handlers.onEscape()) return;
      e.preventDefault();
      e.stopPropagation();
    })
  );

  return disposables;
};
