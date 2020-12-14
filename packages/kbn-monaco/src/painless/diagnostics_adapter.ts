/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

export class DiagnosticsAdapter {
  constructor(private worker: WorkerAccessor) {
    const onModelAdd = (model: monaco.editor.IModel): void => {
      let handle: any;
      model.onDidChangeContent(() => {
        // Every time a new change is made, wait 500ms before validating
        clearTimeout(handle);
        handle = setTimeout(() => this.validate(model.uri), 500);
      });

      this.validate(model.uri);
    };
    monaco.editor.onDidCreateModel(onModelAdd);
    monaco.editor.getModels().forEach(onModelAdd);
  }

  private async validate(resource: monaco.Uri): Promise<void> {
    const worker = await this.worker(resource);
    const errorMarkers = await worker.getSyntaxErrors();

    const model = monaco.editor.getModel(resource);

    // Set the error markers and underline them with "Error" severity
    monaco.editor.setModelMarkers(model!, ID, errorMarkers.map(toDiagnostics));
  }
}
