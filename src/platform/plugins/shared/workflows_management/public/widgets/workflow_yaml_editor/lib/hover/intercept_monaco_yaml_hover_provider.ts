/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import { UNIFIED_HOVER_PROVIDER_ID } from '../monaco_providers/unified_hover_provider';

const yamlHoverProviders: monaco.languages.HoverProvider[] = [];

let originalRegisterHoverProvider: typeof monaco.languages.registerHoverProvider | null = null;

let isIntercepted = false;

/**
 * Initialize the monkey-patch for monaco.languages.registerCompletionItemProvider
 * This must be called BEFORE monaco-yaml is initialized.
 *
 * Intercepts hoverprovider registrations for YAML_LANG_ID and stores all providers
 * so we can call them manually and adjust the hover content.
 */
export function interceptMonacoYamlHoverProvider(): void {
  if (isIntercepted) {
    return;
  }

  originalRegisterHoverProvider = monaco.languages.registerHoverProvider;
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

  monaco.languages.registerHoverProvider = function (
    languageSelector: monaco.languages.LanguageSelector,
    provider: monaco.languages.HoverProvider
  ): monaco.IDisposable {
    const isYaml = isYamlSelector(languageSelector);

    if (isYaml) {
      // use explicit any to access the __providerId property
      const shouldPassThrough =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (provider as any).__providerId === UNIFIED_HOVER_PROVIDER_ID;

      if (shouldPassThrough) {
        if (!originalRegisterHoverProvider) {
          throw new Error('Original registerHoverProvider not stored');
        }
        return originalRegisterHoverProvider.call(this, languageSelector, provider);
      }

      yamlHoverProviders.push(provider);
      return {
        dispose: () => {
          const index = yamlHoverProviders.indexOf(provider);
          if (index !== -1) {
            yamlHoverProviders.splice(index, 1);
          }
        },
      };
    }

    // Register non-YAML providers normally
    if (!originalRegisterHoverProvider) {
      throw new Error('Original registerHoverProvider not stored');
    }
    return originalRegisterHoverProvider.call(this, languageSelector, provider);
  };
}

export function getAllYamlHoverProviders(): readonly monaco.languages.HoverProvider[] {
  // Return a frozen copy to ensure readonly behavior at runtime
  return Object.freeze([...yamlHoverProviders]);
}

/**
 * @internal
 * Test-only utility to clear all stored YAML providers.
 * This should only be used in tests for cleanup between test cases.
 */
export function clearAllYamlHoverProviders(): void {
  yamlHoverProviders.length = 0;
}

/**
 * @internal
 * Test-only utility to reset the interception state.
 * This restores the original registerCompletionItemProvider and clears the stored reference.
 * This should only be used in tests for cleanup between test cases.
 */
export function resetInterception(): void {
  if (originalRegisterHoverProvider && isIntercepted) {
    monaco.languages.registerHoverProvider = originalRegisterHoverProvider;
  }
  originalRegisterHoverProvider = null;
  isIntercepted = false;
  yamlHoverProviders.length = 0;
}
