/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConsoleWorkerProxyService } from './console_worker_proxy';
import { CONSOLE_LANG_ID } from './constants';
import { monaco } from '../monaco_imports';

/*
 * This setup function runs when the Console language is registered into the Monaco editor.
 * It adds a listener that is attached to the editor input when the Monaco editor is used
 * with the Console language.
 * The Console parser that runs in a web worker analyzes the editor input when it changes and
 * if any errors are found, they are added as "error markers" to the Monaco editor.
 */
export const setupConsoleErrorsProvider = (workerProxyService: ConsoleWorkerProxyService) => {
  const updateErrorMarkers = async (model: monaco.editor.IModel): Promise<void> => {
    if (model.isDisposed()) {
      return;
    }
    const parserResult = await workerProxyService.getParserResult(model.uri);

    if (!parserResult) {
      return;
    }
    const { errors } = parserResult;
    monaco.editor.setModelMarkers(
      model,
      CONSOLE_LANG_ID,
      errors.map(({ offset, text }) => {
        const { column, lineNumber } = model.getPositionAt(offset);
        return {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
          message: text,
          severity: monaco.MarkerSeverity.Error,
        };
      })
    );
  };
  const onModelAdd = (model: monaco.editor.IModel) => {
    if (model.getLanguageId() !== CONSOLE_LANG_ID) {
      return;
    }

    const { dispose } = model.onDidChangeContent(async () => {
      await updateErrorMarkers(model);
    });

    model.onWillDispose(() => {
      dispose();
    });

    updateErrorMarkers(model);
  };
  monaco.editor.onDidCreateModel(onModelAdd);
};
