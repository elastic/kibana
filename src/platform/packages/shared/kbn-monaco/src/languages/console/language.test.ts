/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { suggest as suggestFn } from '@kbn/esql-language';
import type { wrapAsMonacoSuggestions as wrapFn } from '../esql/lib/converters/suggestions';
import type {
  checkForTripleQuotesAndEsqlQuery as checkFn,
  unescapeInvalidChars as unescapeFn,
} from './utils';
import type { setupConsoleErrorsProvider as setupErrorsProviderFn } from './console_errors_provider';
import type { ConsoleParsedRequestsProvider as ParsedProviderCtor } from './console_parsed_requests_provider';

import { monaco } from '../../monaco_imports';
import { ESQL_AUTOCOMPLETE_TRIGGER_CHARS } from '../esql';

const mockWorkerSetup = jest.fn<void, []>();

const mockSuggest = jest.fn<ReturnType<typeof suggestFn>, Parameters<typeof suggestFn>>();
const mockWrapAsMonacoSuggestions = jest.fn<ReturnType<typeof wrapFn>, Parameters<typeof wrapFn>>();
const mockCheckForTripleQuotesAndEsqlQuery = jest.fn<
  ReturnType<typeof checkFn>,
  Parameters<typeof checkFn>
>();
const mockUnescapeInvalidChars = jest.fn<
  ReturnType<typeof unescapeFn>,
  Parameters<typeof unescapeFn>
>();
const mockSetupConsoleErrorsProvider = jest.fn<
  ReturnType<typeof setupErrorsProviderFn>,
  Parameters<typeof setupErrorsProviderFn>
>();
const mockConsoleParsedRequestsProvider = jest.fn<
  InstanceType<typeof ParsedProviderCtor>,
  ConstructorParameters<typeof ParsedProviderCtor>
>();

jest.mock('@kbn/esql-language', () => ({
  suggest: (...args: Parameters<typeof mockSuggest>) => mockSuggest(...args),
}));

jest.mock('../esql/lib/converters/suggestions', () => ({
  wrapAsMonacoSuggestions: (...args: Parameters<typeof mockWrapAsMonacoSuggestions>) =>
    mockWrapAsMonacoSuggestions(...args),
}));

jest.mock('./utils', () => ({
  checkForTripleQuotesAndEsqlQuery: (
    ...args: Parameters<typeof mockCheckForTripleQuotesAndEsqlQuery>
  ) => mockCheckForTripleQuotesAndEsqlQuery(...args),
  unescapeInvalidChars: (...args: Parameters<typeof mockUnescapeInvalidChars>) =>
    mockUnescapeInvalidChars(...args),
}));

jest.mock('./console_errors_provider', () => ({
  setupConsoleErrorsProvider: (...args: Parameters<typeof mockSetupConsoleErrorsProvider>) =>
    mockSetupConsoleErrorsProvider(...args),
}));

jest.mock('./console_parsed_requests_provider', () => {
  function ConsoleParsedRequestsProvider(
    ...args: ConstructorParameters<typeof ParsedProviderCtor>
  ) {
    mockConsoleParsedRequestsProvider(...args);
  }
  return { ConsoleParsedRequestsProvider };
});

jest.mock('./console_worker_proxy', () => {
  function ConsoleWorkerProxyService(this: { setup: () => void }) {
    this.setup = () => mockWorkerSetup();
  }
  return { ConsoleWorkerProxyService };
});

import { ConsoleLang, CONSOLE_TRIGGER_CHARS, getParsedRequestsProvider } from './language';

type ProvideCompletionItems = NonNullable<
  monaco.languages.CompletionItemProvider['provideCompletionItems']
>;

const createToken = (): { token: monaco.CancellationToken; dispose: () => void } => {
  const source = new monaco.CancellationTokenSource();
  return { token: source.token, dispose: () => source.dispose() };
};

const createActionsProvider = (): {
  actionsProvider: MutableRefObject<{ provideCompletionItems: ProvideCompletionItems } | null>;
  provideCompletionItems: jest.MockedFunction<ProvideCompletionItems>;
} => {
  const completionList: monaco.languages.CompletionList = { suggestions: [] };
  const provideCompletionItems = jest.fn<
    ReturnType<ProvideCompletionItems>,
    Parameters<ProvideCompletionItems>
  >(() => completionList);

  const actionsProvider: MutableRefObject<{
    provideCompletionItems: ProvideCompletionItems;
  } | null> = {
    current: { provideCompletionItems },
  };

  return { actionsProvider, provideCompletionItems };
};

const createProvider = (
  esqlCallbacks: Pick<ESQLCallbacks, 'getSources' | 'getPolicies'> | undefined,
  actionsProvider: MutableRefObject<{ provideCompletionItems: ProvideCompletionItems } | null>
): monaco.languages.CompletionItemProvider => {
  if (!ConsoleLang.getSuggestionProvider) {
    throw new Error('expected ConsoleLang.getSuggestionProvider to be defined');
  }
  return ConsoleLang.getSuggestionProvider(esqlCallbacks, actionsProvider);
};

const createModel = (lines: string[]): monaco.editor.ITextModel => {
  return monaco.editor.createModel(lines.join('\n'), 'plaintext');
};

describe('console language', () => {
  const baseContext: monaco.languages.CompletionContext = {
    triggerKind: monaco.languages.CompletionTriggerKind.Invoke,
  };

  const createEsqlCallbacks = (): Pick<ESQLCallbacks, 'getSources' | 'getPolicies'> => ({
    getSources: async () => [],
    getPolicies: async () => [],
  });

  const createdModels: monaco.editor.ITextModel[] = [];
  afterEach(() => {
    jest.restoreAllMocks();
    while (createdModels.length) {
      createdModels.pop()?.dispose();
    }
  });

  beforeEach(() => {
    // Global mocks stay, but each test starts from a clean slate:
    // - clears call history
    // - resets per-test stubbed implementations
    jest.resetAllMocks();
  });

  it('exposes triggerCharacters including Console + ES|QL triggers', () => {
    const { actionsProvider } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    expect(provider.triggerCharacters).toEqual(
      expect.arrayContaining([...CONSOLE_TRIGGER_CHARS, ...ESQL_AUTOCOMPLETE_TRIGGER_CHARS])
    );
  });

  it('delegates to actions provider when no request line is found', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    const model = createModel(['{ "not": "a request line" }']);
    createdModels.push(model);

    const getValueSpy = jest.spyOn(model, 'getValue');
    const getValueInRangeSpy = jest.spyOn(model, 'getValueInRange');

    await provider.provideCompletionItems!(model, new monaco.Position(1, 1), baseContext, token);

    expect(provideCompletionItems).toHaveBeenCalledTimes(1);
    expect(getValueSpy).not.toHaveBeenCalled();
    expect(getValueInRangeSpy).not.toHaveBeenCalled();
    expect(mockCheckForTripleQuotesAndEsqlQuery).not.toHaveBeenCalled();
    expect(mockSuggest).not.toHaveBeenCalled();
    expect(mockWrapAsMonacoSuggestions).not.toHaveBeenCalled();

    dispose();
  });

  it('delegates to actions provider for non-_query request lines (e.g. GET _search)', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    const model = createModel(['GET _search', '{ "query": { "match_all": {} } }']);
    createdModels.push(model);

    const getValueInRangeSpy = jest.spyOn(model, 'getValueInRange');

    await provider.provideCompletionItems!(model, new monaco.Position(2, 5), baseContext, token);

    expect(provideCompletionItems).toHaveBeenCalledTimes(1);
    expect(getValueInRangeSpy).not.toHaveBeenCalled();
    expect(mockCheckForTripleQuotesAndEsqlQuery).not.toHaveBeenCalled();

    dispose();
  });

  it('does not treat GET _query as ES|QL request (POST-only) and delegates to actions provider', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    const model = createModel(['GET _query', '{ "query": "FROM logs" }']);
    createdModels.push(model);

    await provider.provideCompletionItems!(model, new monaco.Position(2, 7), baseContext, token);

    expect(provideCompletionItems).toHaveBeenCalledTimes(1);
    expect(mockCheckForTripleQuotesAndEsqlQuery).not.toHaveBeenCalled();

    dispose();
  });

  it('limits request-line lookback to 2000 lines and delegates when request line is beyond lookback', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    const lines = ['POST _query', ...Array.from({ length: 2000 }, () => '')];
    const model = createModel(lines);
    createdModels.push(model);

    const getValueInRangeSpy = jest.spyOn(model, 'getValueInRange');

    await provider.provideCompletionItems!(model, new monaco.Position(2001, 1), baseContext, token);

    expect(provideCompletionItems).toHaveBeenCalledTimes(1);
    expect(getValueInRangeSpy).not.toHaveBeenCalled();
    expect(mockCheckForTripleQuotesAndEsqlQuery).not.toHaveBeenCalled();

    dispose();
  });

  it('runs _query detection via getValueInRange and delegates when not inside ES|QL', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    mockCheckForTripleQuotesAndEsqlQuery.mockReturnValue({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1,
    });

    const model = createModel(['POST _query', '{ "query": "FROM logs" }']);
    createdModels.push(model);

    const getValueInRangeSpy = jest.spyOn(model, 'getValueInRange');

    await provider.provideCompletionItems!(model, new monaco.Position(2, 7), baseContext, token);

    expect(getValueInRangeSpy).toHaveBeenCalledTimes(1);
    expect(mockCheckForTripleQuotesAndEsqlQuery).toHaveBeenCalledTimes(1);
    expect(provideCompletionItems).toHaveBeenCalledTimes(1);
    expect(mockSuggest).not.toHaveBeenCalled();
    expect(mockWrapAsMonacoSuggestions).not.toHaveBeenCalled();
    dispose();
  });

  it('delegates when inside ES|QL but esqlCallbacks are undefined', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    mockCheckForTripleQuotesAndEsqlQuery.mockReturnValue({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: 0,
    });

    const model = createModel(['POST _query', '{ "query": "FROM logs" }']);
    createdModels.push(model);

    await provider.provideCompletionItems!(model, new monaco.Position(2, 7), baseContext, token);

    expect(provideCompletionItems).toHaveBeenCalledTimes(1);
    expect(mockSuggest).not.toHaveBeenCalled();
    expect(mockWrapAsMonacoSuggestions).not.toHaveBeenCalled();
    dispose();
  });

  it('returns empty suggestions when no actions provider is available and request line is not found', async () => {
    const actionsProvider: MutableRefObject<{
      provideCompletionItems: ProvideCompletionItems;
    } | null> = {
      current: null,
    };
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    const model = createModel(['{ "no": "request line" }']);
    createdModels.push(model);

    const result = await provider.provideCompletionItems!(
      model,
      new monaco.Position(1, 1),
      baseContext,
      token
    );

    expect(result).toEqual({ suggestions: [] });
    dispose();
  });

  it('returns empty suggestions when _query detection runs but actions provider is missing', async () => {
    const actionsProvider: MutableRefObject<{
      provideCompletionItems: ProvideCompletionItems;
    } | null> = {
      current: null,
    };
    const provider = createProvider(undefined, actionsProvider);
    const { token, dispose } = createToken();

    mockCheckForTripleQuotesAndEsqlQuery.mockReturnValue({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1,
    });

    const model = createModel(['POST _query', '{ "query": "FROM logs" }']);
    createdModels.push(model);

    const result = await provider.provideCompletionItems!(
      model,
      new monaco.Position(2, 7),
      baseContext,
      token
    );

    expect(result).toEqual({ suggestions: [] });
    dispose();
  });

  it('runs ES|QL suggestions and wraps them when inside ES|QL (single quoted)', async () => {
    const { actionsProvider, provideCompletionItems } = createActionsProvider();
    const esqlCallbacks = createEsqlCallbacks();
    const provider = createProvider(esqlCallbacks, actionsProvider);
    const { token, dispose } = createToken();

    const wrapped: monaco.languages.CompletionList = { suggestions: [] };
    mockWrapAsMonacoSuggestions.mockReturnValue(wrapped);

    mockCheckForTripleQuotesAndEsqlQuery.mockReturnValue({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: 0,
    });

    mockUnescapeInvalidChars.mockReturnValue('UNESCAPED_QUERY');
    mockSuggest.mockResolvedValue([]);

    const model = createModel(['POST _query', '{ "query": "FROM logs" }']);
    createdModels.push(model);

    const result = await provider.provideCompletionItems!(
      model,
      new monaco.Position(2, 7),
      baseContext,
      token
    );

    expect(mockSuggest).toHaveBeenCalledWith(
      'UNESCAPED_QUERY',
      'UNESCAPED_QUERY'.length,
      esqlCallbacks
    );
    expect(mockWrapAsMonacoSuggestions).toHaveBeenCalledTimes(1);
    expect(provideCompletionItems).not.toHaveBeenCalled();
    expect(result).toBe(wrapped);
    dispose();
  });

  it('passes allowSnippets=false when inside triple quotes (ES|QL)', async () => {
    const { actionsProvider } = createActionsProvider();
    const esqlCallbacks = createEsqlCallbacks();
    const provider = createProvider(esqlCallbacks, actionsProvider);
    const { token, dispose } = createToken();

    mockCheckForTripleQuotesAndEsqlQuery.mockReturnValue({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: 0,
    });

    mockUnescapeInvalidChars.mockReturnValue('UNESCAPED_QUERY');
    mockSuggest.mockResolvedValue([]);
    mockWrapAsMonacoSuggestions.mockReturnValue({ suggestions: [] });

    const model = createModel(['POST _query', '{ "query": """FROM logs""" }']);
    createdModels.push(model);

    await provider.provideCompletionItems!(model, new monaco.Position(2, 7), baseContext, token);

    // The 4th arg is `!insideTripleQuotes` -> false when inside triple quotes.
    expect(mockWrapAsMonacoSuggestions.mock.calls[0][3]).toBe(false);
    dispose();
  });

  it('wires onLanguage + parsed request provider', () => {
    ConsoleLang.onLanguage?.();
    expect(mockWorkerSetup).toHaveBeenCalledTimes(1);
    expect(mockSetupConsoleErrorsProvider).toHaveBeenCalledTimes(1);

    const model = createModel(['GET _search']);
    createdModels.push(model);
    getParsedRequestsProvider(model);

    expect(mockConsoleParsedRequestsProvider).toHaveBeenCalledWith(expect.anything(), model);
  });
});
