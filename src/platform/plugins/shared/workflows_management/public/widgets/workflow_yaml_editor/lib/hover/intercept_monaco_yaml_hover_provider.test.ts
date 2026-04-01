/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco, YAML_LANG_ID } from '@kbn/monaco';
import {
  clearAllYamlHoverProviders,
  getAllYamlHoverProviders,
  interceptMonacoYamlHoverProvider,
  resetInterception,
} from './intercept_monaco_yaml_hover_provider';

// Use the string value directly to avoid pulling in the heavy unified_hover_provider module
const UNIFIED_HOVER_PROVIDER_ID = 'unified-hover-provider';

describe('interceptMonacoYamlHoverProvider', () => {
  afterEach(() => {
    resetInterception();
  });

  it('intercepts YAML hover provider registrations', () => {
    interceptMonacoYamlHoverProvider();

    const mockProvider: monaco.languages.HoverProvider = {
      provideHover: jest.fn(),
    };

    const disposable = monaco.languages.registerHoverProvider(YAML_LANG_ID, mockProvider);

    const providers = getAllYamlHoverProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toBe(mockProvider);

    disposable.dispose();
  });

  it('removes the provider on dispose', () => {
    interceptMonacoYamlHoverProvider();

    const mockProvider: monaco.languages.HoverProvider = {
      provideHover: jest.fn(),
    };

    const disposable = monaco.languages.registerHoverProvider(YAML_LANG_ID, mockProvider);
    expect(getAllYamlHoverProviders()).toHaveLength(1);

    disposable.dispose();
    expect(getAllYamlHoverProviders()).toHaveLength(0);
  });

  it('passes through providers with the unified hover provider id', () => {
    interceptMonacoYamlHoverProvider();

    const unifiedProvider = {
      provideHover: jest.fn(),
      __providerId: UNIFIED_HOVER_PROVIDER_ID,
    } as unknown as monaco.languages.HoverProvider;

    // This should call the original registerHoverProvider, not store in the array
    monaco.languages.registerHoverProvider(YAML_LANG_ID, unifiedProvider);

    // Should not be in the intercepted providers array
    expect(getAllYamlHoverProviders()).toHaveLength(0);
  });

  it('does not intercept non-YAML provider registrations', () => {
    interceptMonacoYamlHoverProvider();

    const mockProvider: monaco.languages.HoverProvider = {
      provideHover: jest.fn(),
    };

    monaco.languages.registerHoverProvider('javascript', mockProvider);

    expect(getAllYamlHoverProviders()).toHaveLength(0);
  });

  it('is idempotent - calling interceptMonacoYamlHoverProvider twice does not double-patch', () => {
    interceptMonacoYamlHoverProvider();
    const firstRef = monaco.languages.registerHoverProvider;

    interceptMonacoYamlHoverProvider();
    const secondRef = monaco.languages.registerHoverProvider;

    expect(firstRef).toBe(secondRef);
  });

  it('clearAllYamlHoverProviders removes all stored providers', () => {
    interceptMonacoYamlHoverProvider();

    const provider1: monaco.languages.HoverProvider = { provideHover: jest.fn() };
    const provider2: monaco.languages.HoverProvider = { provideHover: jest.fn() };

    monaco.languages.registerHoverProvider(YAML_LANG_ID, provider1);
    monaco.languages.registerHoverProvider(YAML_LANG_ID, provider2);

    expect(getAllYamlHoverProviders()).toHaveLength(2);

    clearAllYamlHoverProviders();
    expect(getAllYamlHoverProviders()).toHaveLength(0);
  });

  it('resetInterception restores the original registerHoverProvider', () => {
    const original = monaco.languages.registerHoverProvider;

    interceptMonacoYamlHoverProvider();
    expect(monaco.languages.registerHoverProvider).not.toBe(original);

    resetInterception();
    expect(monaco.languages.registerHoverProvider).toBe(original);
  });

  it('handles array-based language selectors for YAML', () => {
    interceptMonacoYamlHoverProvider();

    const mockProvider: monaco.languages.HoverProvider = {
      provideHover: jest.fn(),
    };

    monaco.languages.registerHoverProvider([YAML_LANG_ID], mockProvider);
    expect(getAllYamlHoverProviders()).toHaveLength(1);
  });

  it('handles object-based language selectors for YAML', () => {
    interceptMonacoYamlHoverProvider();

    const mockProvider: monaco.languages.HoverProvider = {
      provideHover: jest.fn(),
    };

    monaco.languages.registerHoverProvider(
      { language: YAML_LANG_ID } as monaco.languages.LanguageSelector,
      mockProvider
    );
    expect(getAllYamlHoverProviders()).toHaveLength(1);
  });

  it('getAllYamlHoverProviders returns a frozen copy', () => {
    interceptMonacoYamlHoverProvider();

    const mockProvider: monaco.languages.HoverProvider = { provideHover: jest.fn() };
    monaco.languages.registerHoverProvider(YAML_LANG_ID, mockProvider);

    const providers = getAllYamlHoverProviders();
    expect(Object.isFrozen(providers)).toBe(true);
  });
});
