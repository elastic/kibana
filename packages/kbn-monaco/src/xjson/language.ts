/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// This file contains a lot of single setup logic for registering a language globally

import { monaco } from '../monaco_imports';
import { WorkerProxyService } from './worker_proxy_service';
import { ID } from './constants';

const OWNER = 'XJSON_GRAMMAR_CHECKER';

monaco.languages.onLanguage(ID, async () => {
  const wps = new WorkerProxyService();

  wps.setup();

  const updateAnnotations = async (model: monaco.editor.IModel): Promise<void> => {
    if (model.isDisposed()) {
      return;
    }
    const parseResult = await wps.getAnnos(model.uri);
    if (!parseResult) {
      return;
    }
    const { annotations } = parseResult;
    monaco.editor.setModelMarkers(
      model,
      OWNER,
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
    if (model.getModeId() !== ID) {
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
});
