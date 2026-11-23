/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../monaco_imports';
import { registerLanguage } from '../../helpers';
import { PromQLLang, PROMQL_LANG_ID } from '.';

// These tests intentionally use the real `monaco-promql` package: the definition is loaded lazily
// via a dynamic import, so a broken import or loader must surface here.
//
// The only stub is the bare `monaco-editor` specifier that `monaco-promql` imports. Jest would
// otherwise resolve it to the AMD bundle (`min/vs/editor/editor.main.js`, which needs `define`);
// point it at the same ESM API module `@kbn/monaco` itself uses so both share one Monaco instance.
jest.mock('monaco-editor', () => jest.requireActual('monaco-editor/editor/editor.api.js'));

describe('PromQLLang', () => {
  let setTokens: jest.Spied<typeof monaco.languages.setMonarchTokensProvider>;
  let setConfig: jest.Spied<typeof monaco.languages.setLanguageConfiguration>;

  beforeAll(() => {
    // Languages must be registered with Monaco before their config/tokenizer can be set.
    registerLanguage(PromQLLang);
  });

  beforeEach(() => {
    setTokens = jest.spyOn(monaco.languages, 'setMonarchTokensProvider');
    setConfig = jest.spyOn(monaco.languages, 'setLanguageConfiguration');
  });

  afterEach(() => {
    [setTokens, setConfig].forEach((spy) => {
      /**
       * `onLanguage` discards the disposables Monaco returns for tokenizer and configuration
       * registrations.
       * Since we spy on the invocations, the return values are still recorded, allowing us to dispose them; disposing them
       * resets Monaco's registry so every test has to install what it needs itself.
       */
      spy.mock.results.forEach((result) => {
        if (result.type === 'return') {
          result.value.dispose();
        }
      });

      spy.mockRestore();
    });
  });

  it('does not register the tokenizer if the monaco-promql definition is not found', async () => {
    jest.doMock('monaco-promql', () => {
      throw new Error('monaco-promql module not found');
    });

    await expect(PromQLLang.onLanguage?.())
      .resolves.toBeUndefined()
      .finally(() => {
        jest.dontMock('monaco-promql');
      });

    expect(setTokens).not.toHaveBeenCalled();
    expect(setConfig).not.toHaveBeenCalled();
  });

  it('lazily loads the real monaco-promql definition and registers its tokenizer', async () => {
    await expect(PromQLLang.onLanguage?.()).resolves.toBeUndefined();

    expect(setTokens).toHaveBeenCalledWith(
      PROMQL_LANG_ID,
      expect.objectContaining({ tokenizer: expect.any(Object) })
    );

    expect(setConfig).toHaveBeenCalledWith(PROMQL_LANG_ID, expect.any(Object));
  });

  it('the PromQL language definition integrates with the editor as expected', async () => {
    const onPromQLLanguageSpy = jest.spyOn(PromQLLang, 'onLanguage');

    const PROMQL_QUERY = 'PROMQL step=1m (rate(http_requests_total[5m]))';

    const model = monaco.editor.createModel(PROMQL_QUERY, PROMQL_LANG_ID);

    expect(onPromQLLanguageSpy).toHaveBeenCalledTimes(1);

    // createModel fires onLanguage without awaiting it; so we wait for the lazy import to finish.
    await onPromQLLanguageSpy.mock.results[0].value;

    expect(setTokens).toHaveBeenCalledTimes(1);
    expect(setConfig).toHaveBeenCalledTimes(1);

    const tokensByLine = monaco.editor.tokenize(model.getValue(), model.getLanguageId());

    expect(
      tokensByLine[0].map((token) => token.type).some((type) => type.endsWith('.promql'))
    ).toBe(true);

    model.dispose();
  });
});
