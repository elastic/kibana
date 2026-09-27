/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, CancellationError } from '../monaco_imports';
import type { LangModuleType, CustomLangModuleType } from '../types';

/**
 * Rejects when Monaco cancels the token.
 * Disposal settles the promise when cancellation does not win the race.
 */
function listenForCancellation(token: monaco.CancellationToken): {
  promise: Promise<never>;
  dispose: () => void;
} {
  let rejectCancellation = (_error: Error) => {};
  let resolveCancellation = () => {};

  const promise = new Promise<never>((resolve, reject) => {
    rejectCancellation = reject;
    // Settle quietly so a lost race does not stay pending. The race result is unchanged.
    resolveCancellation = () => {
      resolve(undefined as never);
    };
  });

  // A rejection that loses the race must not surface as unhandled.
  void promise.catch(() => {});

  const listener = token.onCancellationRequested(() => {
    rejectCancellation(new CancellationError());
  });

  return {
    promise,
    dispose: () => {
      listener.dispose();
      resolveCancellation();
    },
  };
}

/**
 * Helper function to execute a Monaco operation that can be cancelled.
 * So it's can be handled safely, any wrapped operation will throw a monaco CancellationError.
 */
export async function handleInterruptibleMonacoOperation<T>(
  provider: () => T | PromiseLike<T>,
  operationCancellationToken: monaco.CancellationToken
): Promise<T> {
  if (operationCancellationToken.isCancellationRequested) {
    throw new CancellationError();
  }

  const cancellation = listenForCancellation(operationCancellationToken);

  try {
    return await Promise.race([cancellation.promise, Promise.resolve(provider())]);
  } finally {
    cancellation.dispose();
  }
}

export function registerLanguage(language: LangModuleType | CustomLangModuleType, force = false) {
  const { ID, lexerRules, languageConfiguration, foldingRangeProvider } = language;

  if (!force && monaco.languages.getLanguages().some((lang) => lang.id === ID)) {
    return;
  }

  monaco.languages.register({ id: ID });

  if ('languageThemeResolver' in language) {
    monaco.editor.registerLanguageThemeResolver(ID, language.languageThemeResolver);
  }

  monaco.languages.onLanguage(ID, async () => {
    if (lexerRules) {
      monaco.languages.setMonarchTokensProvider(ID, lexerRules);
    }

    if (languageConfiguration) {
      monaco.languages.setLanguageConfiguration(ID, languageConfiguration);
    }

    if (foldingRangeProvider) {
      monaco.languages.registerFoldingRangeProvider(ID, foldingRangeProvider);
    }

    if ('onLanguage' in language) {
      await language.onLanguage?.();
    }
  });
}

/**
 *
 * @deprecated avoid using this function, use `monaco.editor.registerLanguageThemeDefinition` instead
 */
export function registerTheme(id: string, themeData: monaco.editor.IStandaloneThemeData) {
  try {
    monaco.editor.defineTheme(id, themeData);
  } catch (e) {
    // nothing to be here
  }
}
