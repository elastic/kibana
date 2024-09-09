/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParserWorker } from './types';
import { monaco } from '../monaco_imports';
import { WorkerProxyService } from './worker_proxy';

export const setupWorker = (
  langId: string,
  owner: string,
  worker: WorkerProxyService<ParserWorker>
) => {
  worker.setup(langId);

  const updateAnnotations = async (model: monaco.editor.IModel): Promise<void> => {
    if (model.isDisposed()) {
      return;
    }
    const parseResult = await worker.getAnnos(model.uri);
    if (!parseResult) {
      return;
    }
    const { annotations } = parseResult;
    monaco.editor.setModelMarkers(
      model,
      owner,
      annotations.map(({ at, text, type }) => {
        const { column, lineNumber } = model.getPositionAt(at);
        return {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
          message: text,
          severity: type === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        };
      })
    );
  };

  const onModelAdd = (model: monaco.editor.IModel) => {
    if (model.getLanguageId() !== langId) {
      return;
    }

    const { dispose } = model.onDidChangeContent(async () => {
      updateAnnotations(model);
    });

    model.onWillDispose(() => {
      dispose();
    });

    updateAnnotations(model);
  };

  monaco.editor.onDidCreateModel(onModelAdd);
};
