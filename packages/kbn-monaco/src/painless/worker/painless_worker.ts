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

/* eslint-disable-next-line @kbn/eslint/module_migration */
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { PainlessCompletionResult } from '../types';

import {
  getPainlessClassToAutocomplete,
  painlessTypes,
  getPainlessClassesToAutocomplete,
  getPainlessConstructorsToAutocomplete,
} from './painless_completion_utils';

export class PainlessWorker {
  constructor(private ctx: monaco.worker.IWorkerContext) {}

  private _getModel(modelUri: string) {
    return this.ctx.getMirrorModels().find((m) => m.uri.toString() === modelUri);
  }

  async provideAutocompleteSuggestions(
    uri: string,
    currentLineChars: any
  ): Promise<PainlessCompletionResult> {
    const model = this._getModel(uri);

    if (!model) {
      return Promise.resolve({
        isIncomplete: false,
        suggestions: [],
      });
    }

    // const currentText = model.getValue();

    // Array of the active line words, e.g., [boolean, isInCircle]
    const words = currentLineChars.replace('\t', '').split(' ');
    // What the user is currently typing
    const activeTyping = words[words.length - 1];

    // If the active typing contains dot notation, we assume we need to access the object's properties
    const isProperty = activeTyping.split('.').length === 2;
    // If the preceding word is a type, e.g., "boolean", we assume the user is declaring a variable and skip autocomplete
    const hasDeclaredType = words.length === 2 && painlessTypes.includes(words[0]);
    // If the preceding word contains the "new" keyword, we only provide constructor autcompletion
    const isConstructor = words[words.length - 2] === 'new';

    let autocompleteSuggestions: PainlessCompletionResult = {
      isIncomplete: false,
      suggestions: [],
    };

    if (isConstructor) {
      autocompleteSuggestions = getPainlessConstructorsToAutocomplete();
    } else if (isProperty) {
      const className = activeTyping.substring(0, activeTyping.length - 1).split('.')[0];

      autocompleteSuggestions = getPainlessClassToAutocomplete(className);
    } else {
      if (!hasDeclaredType) {
        autocompleteSuggestions = getPainlessClassesToAutocomplete();
      }
    }

    return Promise.resolve(autocompleteSuggestions);
  }
}
