/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../monaco_imports';
import { ID } from './constants';
import { WorkerAccessor } from './language';
import { PainlessError } from './worker';

const toDiagnostics = (error: PainlessError): monaco.editor.IMarkerData => {
  return {
    ...error,
    severity: monaco.MarkerSeverity.Error,
  };
};

export interface SyntaxErrors {
  [modelId: string]: PainlessError[];
}
export class DiagnosticsAdapter {
  private errors: SyntaxErrors = {};

  constructor(private worker: WorkerAccessor) {
    const onModelAdd = (model: monaco.editor.IModel): void => {
      let handle: any;

      if (model.getModeId() === ID) {
        model.onDidChangeContent(() => {
          // Do not validate if the language ID has changed
          if (model.getModeId() !== ID) {
            return;
          }

          // Every time a new change is made, wait 500ms before validating
          clearTimeout(handle);
          handle = setTimeout(() => this.validate(model.uri), 500);
        });

        model.onDidChangeLanguage(({ newLanguage }) => {
          // Reset the model markers if the language ID has changed and is no longer "painless"
          if (newLanguage !== ID) {
            return monaco.editor.setModelMarkers(model, ID, []);
          }
        });

        this.validate(model.uri);
      }
    };
    monaco.editor.onDidCreateModel(onModelAdd);
    monaco.editor.getModels().forEach(onModelAdd);
  }

  private async validate(resource: monaco.Uri): Promise<void> {
    const worker = await this.worker(resource);
    const errorMarkers = await worker.getSyntaxErrors(resource.toString());

    if (errorMarkers) {
      const model = monaco.editor.getModel(resource);
      this.errors = {
        ...this.errors,
        [model!.id]: errorMarkers,
      };
      // Set the error markers and underline them with "Error" severity
      monaco.editor.setModelMarkers(model!, ID, errorMarkers.map(toDiagnostics));
    }
  }

  public getSyntaxErrors() {
    return this.errors;
  }
}
