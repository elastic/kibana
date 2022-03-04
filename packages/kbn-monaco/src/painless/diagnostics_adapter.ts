/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';

import { monaco } from '../monaco_imports';
import { SyntaxErrors, LangValidation } from '../types';
import { ID } from './constants';
import { WorkerAccessor } from './language';
import { PainlessError } from './worker';

const toDiagnostics = (error: PainlessError): monaco.editor.IMarkerData => {
  return {
    ...error,
    severity: monaco.MarkerSeverity.Error,
  };
};

export class DiagnosticsAdapter {
  private errors: SyntaxErrors = {};
  private validation = new BehaviorSubject<LangValidation>({
    isValid: true,
    isValidating: false,
    errors: [],
  });
  // To avoid stale validation data we keep track of the latest call to validate().
  private validateIdx = 0;

  public validation$ = this.validation.asObservable();

  constructor(private worker: WorkerAccessor) {
    const onModelAdd = (model: monaco.editor.IModel): void => {
      let handle: any;

      if (model.getModeId() === ID) {
        model.onDidChangeContent(() => {
          // Do not validate if the language ID has changed
          if (model.getModeId() !== ID) {
            return;
          }

          const idx = ++this.validateIdx; // Disable any possible inflight validation
          clearTimeout(handle);

          // Reset the model markers if an empty string is provided on change
          if (model.getValue().trim() === '') {
            this.validation.next({
              isValid: true,
              isValidating: false,
              errors: [],
            });
            return monaco.editor.setModelMarkers(model, ID, []);
          }

          this.validation.next({
            ...this.validation.value,
            isValidating: true,
          });
          // Every time a new change is made, wait 500ms before validating
          handle = setTimeout(() => {
            this.validate(model.uri, idx);
          }, 500);
        });

        model.onDidChangeLanguage(({ newLanguage }) => {
          // Reset the model markers if the language ID has changed and is no longer "painless"
          // Otherwise, re-validate
          if (newLanguage !== ID) {
            return monaco.editor.setModelMarkers(model, ID, []);
          } else {
            this.validate(model.uri, ++this.validateIdx);
          }
        });

        this.validation.next({
          ...this.validation.value,
          isValidating: true,
        });
        this.validate(model.uri, ++this.validateIdx);
      }
    };
    monaco.editor.onDidCreateModel(onModelAdd);
    monaco.editor.getModels().forEach(onModelAdd);
  }

  private async validate(resource: monaco.Uri, idx: number): Promise<void> {
    if (idx !== this.validateIdx) {
      return;
    }

    const worker = await this.worker(resource);
    const errorMarkers = await worker.getSyntaxErrors(resource.toString());

    if (idx !== this.validateIdx) {
      return;
    }

    if (errorMarkers) {
      const model = monaco.editor.getModel(resource);
      this.errors = {
        ...this.errors,
        [model!.id]: errorMarkers,
      };
      // Set the error markers and underline them with "Error" severity
      monaco.editor.setModelMarkers(model!, ID, errorMarkers.map(toDiagnostics));
    }

    const isValid = errorMarkers === undefined || errorMarkers.length === 0;
    this.validation.next({ isValidating: false, isValid, errors: errorMarkers ?? [] });
  }

  public getSyntaxErrors() {
    return this.errors;
  }
}
