/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MockIModel } from './types';

const createMockModel = (ID: string) => {
  const model: MockIModel = {
    uri: '',
    id: 'mockModel',
    value: '',
    getModeId: () => ID,
    changeContentListeners: [],
    setValue(newValue) {
      this.value = newValue;
      this.changeContentListeners.forEach((listener) => listener());
    },
    getValue() {
      return this.value;
    },
    onDidChangeContent(handler) {
      this.changeContentListeners.push(handler);
    },
    onDidChangeLanguage: (handler) => {
      handler({ newLanguage: ID });
    },
  };

  return model;
};

jest.mock('../monaco_imports', () => {
  const original = jest.requireActual('../monaco_imports');
  const originalMonaco = original.monaco;
  const originalEditor = original.monaco.editor;

  return {
    ...original,
    monaco: {
      ...originalMonaco,
      editor: {
        ...originalEditor,
        model: null,
        createModel(ID: string) {
          this.model = createMockModel(ID);
          return this.model;
        },
        onDidCreateModel(handler: (model: MockIModel) => void) {
          if (!this.model) {
            throw new Error(
              `Model needs to be created by calling monaco.editor.createModel(ID) first.`
            );
          }
          handler(this.model);
        },
        getModel() {
          return this.model;
        },
        getModels: () => [],
        setModelMarkers: () => undefined,
      },
    },
  };
});
