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
import {
  getAllYamlProviders,
  interceptMonacoYamlProvider,
  resetInterception,
} from './intercept_monaco_yaml_provider';

// Mock monaco before importing
jest.mock('@kbn/monaco', () => {
  const actualMonaco = jest.requireActual('@kbn/monaco');
  return {
    ...actualMonaco,
    monaco: {
      ...actualMonaco.monaco,
      languages: {
        ...actualMonaco.monaco.languages,
        registerCompletionItemProvider: jest.fn(),
      },
    },
  };
});

describe('interceptMonacoYamlProvider', () => {
  let originalRegister: jest.Mock;
  let mockDisposable: monaco.IDisposable;

  beforeEach(() => {
    jest.clearAllMocks();
    resetInterception();
    mockDisposable = { dispose: jest.fn() };
    originalRegister = jest.fn(() => mockDisposable);
    (monaco.languages.registerCompletionItemProvider as jest.Mock) = originalRegister;
  });

  afterEach(() => {
    resetInterception();
  });

  describe('interceptMonacoYamlProvider', () => {
    it('should store original registerCompletionItemProvider function', () => {
      interceptMonacoYamlProvider();
      expect(originalRegister).not.toHaveBeenCalled();
    });

    it('should only patch once even if called multiple times', () => {
      interceptMonacoYamlProvider();
      const firstCall = monaco.languages.registerCompletionItemProvider;
      interceptMonacoYamlProvider();
      const secondCall = monaco.languages.registerCompletionItemProvider;
      expect(firstCall).toBe(secondCall);
    });

    it('should register workflow provider normally', () => {
      interceptMonacoYamlProvider();

      const workflowProvider: monaco.languages.CompletionItemProvider & { __providerId?: string } =
        {
          __providerId: WORKFLOW_COMPLETION_PROVIDER_ID,
          provideCompletionItems: jest.fn(),
        };

      const result = monaco.languages.registerCompletionItemProvider(
        YAML_LANG_ID,
        workflowProvider
      );

      expect(originalRegister).toHaveBeenCalledWith(YAML_LANG_ID, workflowProvider);
      expect(result).toBe(mockDisposable);
      expect(getAllYamlProviders()).toHaveLength(0);
    });

    it('should store non-workflow YAML providers without registering them', () => {
      interceptMonacoYamlProvider();

      const yamlProvider: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };

      const result = monaco.languages.registerCompletionItemProvider(YAML_LANG_ID, yamlProvider);

      expect(originalRegister).not.toHaveBeenCalled();
      expect(result).toEqual({ dispose: expect.any(Function) });
      expect(getAllYamlProviders()).toHaveLength(1);
      expect(getAllYamlProviders()[0]).toBe(yamlProvider);
    });

    it('should handle YAML provider with LanguageFilter selector', () => {
      interceptMonacoYamlProvider();

      const yamlProvider: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };

      const result = monaco.languages.registerCompletionItemProvider(
        { language: YAML_LANG_ID },
        yamlProvider
      );

      expect(originalRegister).not.toHaveBeenCalled();
      expect(result).toEqual({ dispose: expect.any(Function) });
      expect(getAllYamlProviders()).toHaveLength(1);
    });

    it('should handle YAML provider with array selector containing YAML', () => {
      interceptMonacoYamlProvider();

      const yamlProvider: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };

      const result = monaco.languages.registerCompletionItemProvider(
        [YAML_LANG_ID, 'json'],
        yamlProvider
      );

      expect(originalRegister).not.toHaveBeenCalled();
      expect(result).toEqual({ dispose: expect.any(Function) });
      expect(getAllYamlProviders()).toHaveLength(1);
    });

    it('should register non-YAML providers normally', () => {
      interceptMonacoYamlProvider();

      const jsonProvider: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };

      const result = monaco.languages.registerCompletionItemProvider('json', jsonProvider);

      expect(originalRegister).toHaveBeenCalledWith('json', jsonProvider);
      expect(result).toBe(mockDisposable);
      expect(getAllYamlProviders()).toHaveLength(0);
    });

    it('should store multiple YAML providers', () => {
      interceptMonacoYamlProvider();

      const provider1: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };
      const provider2: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };

      monaco.languages.registerCompletionItemProvider(YAML_LANG_ID, provider1);
      monaco.languages.registerCompletionItemProvider(YAML_LANG_ID, provider2);

      expect(getAllYamlProviders()).toHaveLength(2);
      expect(getAllYamlProviders()[0]).toBe(provider1);
      expect(getAllYamlProviders()[1]).toBe(provider2);
    });
  });

  describe('getAllYamlProviders', () => {
    it('should return empty array initially', () => {
      expect(getAllYamlProviders()).toEqual([]);
    });

    it('should return stored providers after interception', () => {
      interceptMonacoYamlProvider();

      const provider1: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };
      const provider2: monaco.languages.CompletionItemProvider = {
        provideCompletionItems: jest.fn(),
      };

      monaco.languages.registerCompletionItemProvider(YAML_LANG_ID, provider1);
      monaco.languages.registerCompletionItemProvider(YAML_LANG_ID, provider2);

      const providers = getAllYamlProviders();
      expect(providers).toHaveLength(2);
      expect(providers[0]).toBe(provider1);
      expect(providers[1]).toBe(provider2);
    });

    it('should return readonly array', () => {
      interceptMonacoYamlProvider();
      const providers = getAllYamlProviders();
      expect(() => {
        // @ts-expect-error - testing readonly
        providers.push({});
      }).toThrow();
    });
  });
});
