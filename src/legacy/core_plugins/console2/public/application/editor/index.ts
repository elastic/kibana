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

/**
 * This class is responsible for acting as an abstraction layer between consumers
 * and whatever editor implementation we are using. It should consist only of the methods
 * we find useful for an editor to have, like:
 *
 * - Registering a lang
 * - Registering autocompletion
 * - Getting the current content of the editor
 *
 * The fact that we use Monaco should, in as far as possible, be an implementation detail.
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import './monaco/components';

import * as consoleEditor from './monaco/lifecycle';
import { Theme } from '../../types';

export class Editor {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor(private readonly mountElement: HTMLElement, readonly themeName: Theme) {}

  async setup() {
    this.editor = consoleEditor.setup({ element: this.mountElement, theme: this.themeName });
  }

  teardown() {
    consoleEditor.teardown();
  }

  recalculateLayout() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  async startWorker() {}
}

export const createEditor = ({
  mountElement,
  themeName,
}: {
  mountElement: HTMLElement;
  themeName: Theme;
}) => {
  return new Editor(mountElement, themeName);
};
