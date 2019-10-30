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

// @ts-ignore
import Autocomplete from './autocomplete';

import { LegacyEditor } from '../../../np_ready/public/application/models';

// @ts-ignore
import SenseEditor from './sense_editor/editor';
import { Position } from '../../../np_ready/public/types';

let input: any;
export function initializeEditor($el: JQuery<HTMLElement>, $actionsEl: JQuery<HTMLElement>) {
  input = new SenseEditor($el);

  // Autocomplete should not use any Ace functionality directly
  // so we build a shim here.
  const editorShim = {
    coreEditor: new LegacyEditor(input),
    parser: input.parser,
    execCommand: (cmd: string) => input.execCommand(cmd),
    getCursorPosition: (): Position | null => {
      if (input.selection && input.selection.lead) {
        return {
          lineNumber: input.selection.lead.row + 1,
          column: input.selection.lead.column + 1,
        };
      }
      return null;
    },
    isCompleterActive: () => {
      return Boolean(input.__ace.completer && input.__ace.completer.activated);
    },
    addChangeListener: (fn: any) => input.on('changeSelection', fn),
    removeChangeListener: (fn: any) => input.off('changeSelection', fn),
  };

  input.autocomplete = new (Autocomplete as any)(editorShim);
  input.setOptions({
    enableBasicAutocompletion: true,
  });
  input.$blockScrolling = Infinity;
  input.$actions = $actionsEl;

  /**
   * Init the editor
   */
  input.focus();
  input.highlightCurrentRequestsAndUpdateActionBar();

  return input;
}

// eslint-disable-next-line
export default function getInput() {
  return input;
}
