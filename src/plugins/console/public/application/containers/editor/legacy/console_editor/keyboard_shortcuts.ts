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
import { throttle } from 'lodash';
import { SenseEditor } from '../../../../models/sense_editor';

interface Actions {
  senseEditor: SenseEditor;
  sendCurrentRequestToES: () => void;
  openDocumentation: () => void;
}

export function registerCommands({
  senseEditor,
  sendCurrentRequestToES,
  openDocumentation,
}: Actions) {
  const throttledAutoIndent = throttle(() => senseEditor.autoIndent(), 500, {
    leading: true,
    trailing: true,
  });
  const coreEditor = senseEditor.getCoreEditor();

  coreEditor.registerKeyboardShortcut({
    keys: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
    name: 'send to Elasticsearch',
    fn: () => sendCurrentRequestToES(),
  });

  coreEditor.registerKeyboardShortcut({
    name: 'open documentation',
    keys: { win: 'Ctrl-/', mac: 'Command-/' },
    fn: () => {
      openDocumentation();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'auto indent request',
    keys: { win: 'Ctrl-I', mac: 'Command-I' },
    fn: () => {
      throttledAutoIndent();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'move to previous request start or end',
    keys: { win: 'Ctrl-Up', mac: 'Command-Up' },
    fn: () => {
      senseEditor.moveToPreviousRequestEdge();
    },
  });

  coreEditor.registerKeyboardShortcut({
    name: 'move to next request start or end',
    keys: { win: 'Ctrl-Down', mac: 'Command-Down' },
    fn: () => {
      senseEditor.moveToNextRequestEdge(false);
    },
  });
}
