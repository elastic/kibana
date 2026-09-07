/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import { WORKFLOW_COMPLETION_PROVIDER_ID } from './get_completion_item_provider';

const yamlProviders: monaco.languages.CompletionItemProvider[] = [];

let originalRegisterCompletionItemProvider:
  | typeof monaco.languages.registerCompletionItemProvider
  | null = null;

let isIntercepted = false;

/**
 * Initialize the monkey-patch for monaco.languages.registerCompletionItemProvider
 * This must be called BEFORE monaco-yaml is initialized.
 *
 * Intercepts provider registrations for YAML_LANG_ID and stores all providers
 * so we can call them manually and deduplicate results.
 */
export function interceptMonacoYamlProvider(): void {
  if (isIntercepted) {
    return;
  }

  originalRegisterCompletionItemProvider = monaco.languages.registerCompletionItemProvider;
  isIntercepted = true;

  const isYamlSelector = (selector: monaco.languages.LanguageSelector): boolean => {
    if (typeof selector === 'string') {
      return selector === YAML_LANG_ID;
    }
    if (Array.isArray(selector)) {
      return selector.some((item) => {
        if (typeof item === 'string') {
          return item === YAML_LANG_ID;
        }
        return item.language === YAML_LANG_ID;
      });
    }
    const filter = selector as monaco.languages.LanguageFilter;
    return filter.language === YAML_LANG_ID;
  };

  monaco.languages.registerCompletionItemProvider = function (
    languageSelector: monaco.languages.LanguageSelector,
    provider: monaco.languages.CompletionItemProvider
  ): monaco.IDisposable {
    const isYaml = isYamlSelector(languageSelector);

    if (isYaml) {
      // use explicit any to access the __providerId property
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isWorkflowProvider = (provider as any).__providerId === WORKFLOW_COMPLETION_PROVIDER_ID;

      if (isWorkflowProvider) {
        if (!originalRegisterCompletionItemProvider) {
          throw new Error('Original registerCompletionItemProvider not stored');
        }
        return originalRegisterCompletionItemProvider.call(this, languageSelector, provider);
      }

      yamlProviders.push(provider);
      return {
        dispose: () => {
          const index = yamlProviders.indexOf(provider);
          if (index !== -1) {
            yamlProviders.splice(index, 1);
          }
        },
      };
    }

    // Register non-YAML providers normally
    if (!originalRegisterCompletionItemProvider) {
      throw new Error('Original registerCompletionItemProvider not stored');
    }
    return originalRegisterCompletionItemProvider.call(this, languageSelector, provider);
  };
}

export function getAllYamlProviders(): readonly monaco.languages.CompletionItemProvider[] {
  // Return a frozen copy to ensure readonly behavior at runtime
  return Object.freeze([...yamlProviders]);
}

/**
 * @internal
 * Test-only utility to clear all stored YAML providers.
 * This should only be used in tests for cleanup between test cases.
 */
export function clearAllYamlProviders(): void {
  yamlProviders.length = 0;
}

/**
 * @internal
 * Test-only utility to reset the interception state.
 * This restores the original registerCompletionItemProvider and clears the stored reference.
 * This should only be used in tests for cleanup between test cases.
 */
export function resetInterception(): void {
  if (originalRegisterCompletionItemProvider && isIntercepted) {
    monaco.languages.registerCompletionItemProvider = originalRegisterCompletionItemProvider;
  }
  originalRegisterCompletionItemProvider = null;
  isIntercepted = false;
  yamlProviders.length = 0;
}
