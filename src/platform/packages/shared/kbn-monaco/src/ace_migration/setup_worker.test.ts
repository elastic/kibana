/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../monaco_imports';
import type { ParserWorker } from './types';
import type { WorkerProxyService } from './worker_proxy';
import { setupWorker } from './setup_worker';

const LANG_ID = 'xjson';
const OWNER = 'xjson-owner';

const createModelHarness = (languageId: string = LANG_ID) => {
  // Monaco falls back to `plaintext` for an unknown language, which would make the provider's
  // language guard skip the model and quietly void the test.
  monaco.languages.register({ id: languageId });

  // A real model, so listener registrations return Monaco's own disposables rather than a
  // stand-in — detaching `dispose` from one of those is the regression under test.
  const model = monaco.editor.createModel('', languageId);
  expect(model.getLanguageId()).toBe(languageId);

  return {
    model,
    onDidChangeContent: jest.spyOn(model, 'onDidChangeContent'),
    onWillDispose: jest.spyOn(model, 'onWillDispose'),
  };
};

let reportedErrors: Error[] = [];

// Monaco's `Emitter` catches listener errors and routes them to the unexpected-error handler
// rather than rethrowing, so a throwing `onWillDispose` listener never reaches whoever called
// `model.dispose()`. Capturing here is the only way to observe one.
jest.mock('monaco-editor/base/common/errors.js', () => ({
  errorHandler: {
    unexpectedErrorHandler: jest.fn((error: Error) => reportedErrors.push(error)),
  },
}));

describe('setupWorker', () => {
  let registerModel: (model: monaco.editor.IModel) => void;
  let workerProxyService: WorkerProxyService<ParserWorker>;

  beforeEach(() => {
    reportedErrors = [];

    jest.spyOn(monaco.editor, 'setModelMarkers').mockImplementation(() => {});
    jest.spyOn(monaco.editor, 'onDidCreateModel').mockImplementation((listener) => {
      registerModel = listener;
      return { dispose: jest.fn() };
    });

    workerProxyService = {
      setup: jest.fn(),
      getAnnos: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkerProxyService<ParserWorker>;

    setupWorker(LANG_ID, OWNER, workerProxyService);
  });

  afterEach(() => {
    monaco.editor.getModels().forEach((model) => model.dispose());
    jest.restoreAllMocks();
  });

  it('tears down the content listener without erroring when the model is disposed', () => {
    const { model, onDidChangeContent, onWillDispose } = createModelHarness();

    registerModel(model);
    expect(onDidChangeContent).toHaveBeenCalled();
    expect(onWillDispose).toHaveBeenCalled();

    model.dispose();

    expect(reportedErrors).toEqual([]);
  });

  it('ignores models belonging to another language', () => {
    const { model, onDidChangeContent, onWillDispose } = createModelHarness('painless');

    registerModel(model);

    expect(onDidChangeContent).not.toHaveBeenCalled();
    expect(onWillDispose).not.toHaveBeenCalled();
  });
});
