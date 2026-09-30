/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render } from '@testing-library/react';
import type { MonacoYamlOptions } from 'monaco-yaml';
import React from 'react';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import type { CodeEditorProps, monaco } from '@kbn/code-editor';
import * as kbnMonaco from '@kbn/monaco';
import { YamlEditor } from './yaml_editor';
import { yamlLanguageService } from './yaml_language_service';

// Create a mock for monacoYaml
const mockDispose = vi.fn();
const mockUpdate = vi.fn();

// Read the mocked module lazily and synchronously, like Jest's requireMock did. An awaited
// vi.importMock resolves asynchronously and can outlast the tests' single setTimeout(0) wait
// under load. The cast is needed because the mock factory replaces the typed export.
const mockedKbnMonaco = kbnMonaco as unknown as { configureMonacoYamlSchema: Mock };

// Mock the yaml_language_service
vi.mock('./yaml_language_service', () => {
  // Create a closure to hold the mock instance
  const mockState = { instance: null };

  return {
    yamlLanguageService: {
      initialize: vi.fn().mockImplementation(async () => {
        mockState.instance = await mockedKbnMonaco.configureMonacoYamlSchema();
        return mockState.instance;
      }),
      update: vi.fn().mockImplementation(async (schemas) => {
        if (!mockState.instance) {
          // Initialize if not already done
          // eslint-disable-next-line require-atomic-updates
          mockState.instance = await mockedKbnMonaco.configureMonacoYamlSchema(schemas);
          // @ts-expect-error - mockState.instance is not typed
        } else if (mockState.instance.update) {
          // @ts-expect-error - mockState.instance is not typed
          mockState.instance.update({
            completion: true,
            hover: false,
            validate: true,
            schemas,
          });
        }
      }),
      clearSchemas: vi.fn().mockImplementation(async () => {
        // @ts-expect-error - mockState.instance is not typed
        if (mockState.instance && mockState.instance.update) {
          // @ts-expect-error - mockState.instance is not typed
          mockState.instance.update({
            completion: true,
            hover: false,
            validate: true,
            schemas: [],
          });
        }
      }),
      dispose: vi.fn().mockImplementation(() => {
        // @ts-expect-error - mockState.instance is not typed
        if (mockState.instance && mockState.instance.dispose) {
          // @ts-expect-error - mockState.instance is not typed
          mockState.instance.dispose();
        }
        mockState.instance = null;
      }),
      getInstance: vi.fn().mockImplementation(() => mockState.instance),
      isInitialized: vi.fn().mockImplementation(() => mockState.instance !== null),
    },
  };
});

// Mock the CodeEditor component
vi.mock('@kbn/code-editor', async () => {
  const original = await vi.importActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: CodeEditorProps) => {
      // Use React from the outer scope
      const { useEffect } = require('react');
      const { editorWillUnmount, value, onChange } = props;

      // Store the editorWillUnmount callback so we can call it in tests
      useEffect(() => {
        return () => {
          if (editorWillUnmount) {
            editorWillUnmount();
          }
        };
      }, [editorWillUnmount]);

      return (
        <div data-testid="code-editor">
          <textarea
            data-testid="code-editor-textarea"
            value={value || ''}
            onChange={(e) =>
              onChange &&
              onChange(e.target.value, {} as unknown as monaco.editor.IModelContentChangedEvent)
            }
          />
        </div>
      );
    },
  };
});

// Mock lodash debounce to execute immediately in tests
vi.mock('lodash', () => {
  const mocked = {
    ...require('lodash'),
    debounce: (fn: Function) => {
      const debouncedFn = fn as Function & { flush: () => void; cancel: () => void };
      debouncedFn.flush = () => {};
      debouncedFn.cancel = () => {};
      return debouncedFn;
    },
  };
  return { ...mocked, default: mocked };
});

// Mock the configureMonacoYamlSchema function
vi.mock('@kbn/monaco', () => {
  const mocked = {
    configureMonacoYamlSchema: vi.fn(() =>
      Promise.resolve({
        dispose: mockDispose,
        update: mockUpdate,
      })
    ),
  };
  return { ...mocked, default: mocked };
});

describe('YamlEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispose.mockClear();
    mockUpdate.mockClear();
    // Reset singleton by disposing the service
    yamlLanguageService.dispose();
    // Clear the dispose mock after calling it
    vi.mocked(yamlLanguageService.dispose).mockClear();
  });

  describe('monacoYaml singleton behavior', () => {
    it('should create singleton on mount and clear schemas on unmount', async () => {
      const onChange = vi.fn();
      const schemas = [
        {
          uri: 'http://example.com/schema.json',
          schema: {},
          fileMatch: ['*.yaml', '*.yml'],
        },
      ];

      // Render the component
      const { unmount } = render(
        <YamlEditor value="test: value" onChange={onChange} schemas={schemas} />
      );

      // Wait for the async configuration to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify that yamlLanguageService.update was called
      expect(yamlLanguageService.update).toHaveBeenCalledWith(schemas);

      // Verify singleton was created
      expect(yamlLanguageService.getInstance()).not.toBeNull();

      // Unmount the component
      unmount();

      // Verify that clearSchemas was called
      expect(yamlLanguageService.clearSchemas).toHaveBeenCalled();

      // Verify singleton still exists (service doesn't dispose on unmount, just clears schemas)
      expect(yamlLanguageService.getInstance()).not.toBeNull();

      // Verify dispose was NOT called on the service (service doesn't dispose on unmount)
      expect(yamlLanguageService.dispose).not.toHaveBeenCalled();
    });

    it('should not update schemas if singleton was never initialized', async () => {
      const onChange = vi.fn();

      // Mock configureMonacoYamlSchema to never resolve
      const monaco = await vi.importMock('@kbn/monaco');
      (monaco.configureMonacoYamlSchema as Mock).mockReturnValue(new Promise(() => {}));

      // Render the component
      const { unmount } = render(
        <YamlEditor value="test: value" onChange={onChange} schemas={null} />
      );

      // Unmount the component immediately
      unmount();

      // Verify that clearSchemas was called even though singleton was never initialized
      expect(yamlLanguageService.clearSchemas).toHaveBeenCalled();
      expect(yamlLanguageService.getInstance()).toBeNull();

      // Restore the mock
      (monaco.configureMonacoYamlSchema as Mock).mockImplementation(() =>
        Promise.resolve({
          dispose: mockDispose,
          update: mockUpdate,
        })
      );
    });

    it('should persist singleton after unmount and remount', async () => {
      const onChange = vi.fn();
      const schemas = [
        {
          uri: 'http://example.com/schema.json',
          schema: {},
          fileMatch: ['*.yaml', '*.yml'],
        },
      ];

      // First mount
      const { unmount } = render(
        <YamlEditor value="test: value" onChange={onChange} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify yamlLanguageService was initialized
      expect(yamlLanguageService.update).toHaveBeenCalledWith(schemas);
      const firstSingleton = yamlLanguageService.getInstance();
      expect(firstSingleton).not.toBeNull();

      // Unmount - this clears schemas but keeps the singleton
      unmount();

      // Verify schemas were cleared but singleton still exists
      expect(yamlLanguageService.getInstance()).not.toBeNull();
      expect(yamlLanguageService.clearSchemas).toHaveBeenCalled();

      // Clear mocks
      vi.clearAllMocks();

      // Remount - should reuse the same singleton
      const { unmount: unmount2 } = render(
        <YamlEditor value="test: value2" onChange={onChange} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify update was called again with new schemas
      expect(yamlLanguageService.update).toHaveBeenCalledWith(schemas);
      expect(yamlLanguageService.getInstance()).not.toBeNull();
      expect(yamlLanguageService.getInstance()).toBe(firstSingleton); // Same instance

      // Unmount again
      unmount2();

      // Verify singleton still exists
      expect(yamlLanguageService.getInstance()).not.toBeNull();
    });

    it('should clear singleton when any component unmounts', async () => {
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();
      const schemas = [
        {
          uri: 'http://example.com/schema.json',
          schema: {},
          fileMatch: ['*.yaml', '*.yml'],
        },
      ];

      // Mount first component
      const { unmount: unmount1 } = render(
        <YamlEditor value="value1" onChange={onChange1} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      const firstSingleton = yamlLanguageService.getInstance();
      expect(firstSingleton).not.toBeNull();

      // Mount second component while first is still mounted
      const { unmount: unmount2 } = render(
        <YamlEditor value="value2" onChange={onChange2} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both should use same singleton
      expect(yamlLanguageService.getInstance()).toBe(firstSingleton);
      expect((await vi.importMock('@kbn/monaco')).configureMonacoYamlSchema).toHaveBeenCalledTimes(
        1
      );

      // Unmount first component - schemas are cleared but singleton persists
      unmount1();
      expect(yamlLanguageService.getInstance()).not.toBeNull();

      // The second component still exists and singleton is still active
      // This is the new behavior - unmount only clears schemas, not the singleton

      // Unmount second component
      unmount2();
      // Singleton still exists
      expect(yamlLanguageService.getInstance()).not.toBeNull();
    });

    it('should handle custom editorWillUnmount callback', async () => {
      const onChange = vi.fn();
      const customUnmount = vi.fn();
      const schemas = [
        {
          uri: 'http://example.com/schema.json',
          schema: {},
          fileMatch: ['*.yaml', '*.yml'],
        },
      ];

      // Render with custom unmount callback
      const { unmount } = render(
        <YamlEditor
          value="test: value"
          onChange={onChange}
          schemas={schemas}
          editorWillUnmount={customUnmount}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Unmount
      unmount();

      // Verify custom callback was called
      expect(customUnmount).toHaveBeenCalled();

      // And schemas were cleared
      expect(yamlLanguageService.clearSchemas).toHaveBeenCalled();
    });

    it('should initialize singleton only once when multiple instances are rendered', async () => {
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();
      const onChange3 = vi.fn();

      const schemas1 = [
        {
          uri: 'http://example.com/schema1.json',
          schema: { type: 'object' },
          fileMatch: ['*.yaml'],
        },
      ];

      const schemas2 = [
        {
          uri: 'http://example.com/schema2.json',
          schema: { type: 'array' },
          fileMatch: ['*.yml'],
        },
      ];

      // Clear mocks to ensure clean count
      vi.clearAllMocks();
      const monaco = await vi.importMock('@kbn/monaco');

      // Render first instance
      const { unmount: unmount1 } = render(
        <YamlEditor
          value="test1: value1"
          onChange={onChange1}
          schemas={schemas1 as MonacoYamlOptions['schemas']}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify initialization happened
      expect(yamlLanguageService.update).toHaveBeenCalledTimes(1);
      expect(yamlLanguageService.update).toHaveBeenCalledWith(schemas1);
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledTimes(1);

      const singleton = yamlLanguageService.getInstance();
      expect(singleton).not.toBeNull();

      // Render second instance while first is still mounted
      const { unmount: unmount2 } = render(
        <YamlEditor
          value="test2: value2"
          onChange={onChange2}
          schemas={schemas2 as MonacoYamlOptions['schemas']}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify update was called but no new initialization
      expect(yamlLanguageService.update).toHaveBeenCalledTimes(2);
      expect(yamlLanguageService.update).toHaveBeenCalledWith(schemas2);
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledTimes(1); // Still only 1
      expect(yamlLanguageService.getInstance()).toBe(singleton); // Same instance

      // Render third instance
      const { unmount: unmount3 } = render(
        <YamlEditor
          value="test3: value3"
          onChange={onChange3}
          schemas={schemas1 as MonacoYamlOptions['schemas']}
        />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify update was called again but still no new initialization
      expect(yamlLanguageService.update).toHaveBeenCalledTimes(3);
      expect(yamlLanguageService.update).toHaveBeenLastCalledWith(schemas1);
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledTimes(1); // Still only 1
      expect(yamlLanguageService.getInstance()).toBe(singleton); // Still same instance

      // Unmount all
      unmount1();
      unmount2();
      unmount3();

      // Verify clearSchemas was called for each unmount
      expect(yamlLanguageService.clearSchemas).toHaveBeenCalledTimes(3);

      // Singleton should still exist
      expect(yamlLanguageService.getInstance()).toBe(singleton);
    });
  });

  describe('schema updates', () => {
    it('should update singleton when schemas change', async () => {
      const onChange = vi.fn();
      const initialSchemas = [
        {
          uri: 'http://example.com/schema1.json',
          schema: { type: 'object' as const },
          fileMatch: ['*.yaml', '*.yml'],
        },
      ];
      const updatedSchemas = [
        {
          uri: 'http://example.com/schema2.json',
          schema: { type: 'array' as const },
          fileMatch: ['*.yaml', '*.yml'],
        },
      ];

      const { rerender } = render(
        <YamlEditor value="test: value" onChange={onChange} schemas={initialSchemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify initial configuration
      expect(yamlLanguageService.getInstance()).not.toBeNull();

      // Clear mocks to track new calls
      mockUpdate.mockClear();

      // Update schemas
      rerender(<YamlEditor value="test: value" onChange={onChange} schemas={updatedSchemas} />);

      // Verify update was called with new schemas
      expect(yamlLanguageService.update).toHaveBeenCalledWith(updatedSchemas);
    });
  });

  describe('value and onChange behavior', () => {
    it('should update internal value and call onChange when text changes', () => {
      const onChange = vi.fn();
      const initialValue = 'test: initial';
      const newValue = 'test: updated';

      const { container } = render(
        <YamlEditor value={initialValue} onChange={onChange} schemas={null} />
      );

      const textarea = container.querySelector(
        '[data-testid="code-editor-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe(initialValue);

      // Simulate text change using React Testing Library's fireEvent
      fireEvent.change(textarea, { target: { value: newValue } });

      // Verify onChange was called with new value
      expect(onChange).toHaveBeenCalledWith(newValue);
    });

    it('should update internal value when prop value changes', () => {
      const onChange = vi.fn();
      const initialValue = 'test: initial';
      const newPropValue = 'test: from-props';

      const { container, rerender } = render(
        <YamlEditor value={initialValue} onChange={onChange} schemas={null} />
      );

      // Update the value prop
      rerender(<YamlEditor value={newPropValue} onChange={onChange} schemas={null} />);

      const textarea = container.querySelector(
        '[data-testid="code-editor-textarea"]'
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe(newPropValue);
    });
  });

  describe('onSyncStateChange callback', () => {
    it('should call onSyncStateChange(false) then onSyncStateChange(true) when text changes', () => {
      const onChange = vi.fn();
      const onSyncStateChange = vi.fn();

      const { container } = render(
        <YamlEditor
          value="test: initial"
          onChange={onChange}
          onSyncStateChange={onSyncStateChange}
          schemas={null}
        />
      );

      const textarea = container.querySelector(
        '[data-testid="code-editor-textarea"]'
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'test: updated' } });

      // With debounce mocked to execute immediately, both calls happen synchronously:
      // 1. onSyncStateChange(false) — pending changes
      // 2. onSyncStateChange(true) — debounced onChange flushed
      expect(onSyncStateChange).toHaveBeenCalledTimes(2);
      expect(onSyncStateChange).toHaveBeenNthCalledWith(1, false);
      expect(onSyncStateChange).toHaveBeenNthCalledWith(2, true);
    });

    it('should call onSyncStateChange for each text change', () => {
      const onChange = vi.fn();
      const onSyncStateChange = vi.fn();

      const { container } = render(
        <YamlEditor
          value="test: initial"
          onChange={onChange}
          onSyncStateChange={onSyncStateChange}
          schemas={null}
        />
      );

      const textarea = container.querySelector(
        '[data-testid="code-editor-textarea"]'
      ) as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'test: first' } });
      fireEvent.change(textarea, { target: { value: 'test: second' } });

      // Each change produces a false then true call
      expect(onSyncStateChange).toHaveBeenCalledTimes(4);
      expect(onSyncStateChange).toHaveBeenNthCalledWith(1, false);
      expect(onSyncStateChange).toHaveBeenNthCalledWith(2, true);
      expect(onSyncStateChange).toHaveBeenNthCalledWith(3, false);
      expect(onSyncStateChange).toHaveBeenNthCalledWith(4, true);
    });

    it('should work without onSyncStateChange (optional prop)', () => {
      const onChange = vi.fn();

      const { container } = render(
        <YamlEditor value="test: initial" onChange={onChange} schemas={null} />
      );

      const textarea = container.querySelector(
        '[data-testid="code-editor-textarea"]'
      ) as HTMLTextAreaElement;

      // Should not throw when onSyncStateChange is not provided
      expect(() => {
        fireEvent.change(textarea, { target: { value: 'test: updated' } });
      }).not.toThrow();

      expect(onChange).toHaveBeenCalledWith('test: updated');
    });
  });
});
