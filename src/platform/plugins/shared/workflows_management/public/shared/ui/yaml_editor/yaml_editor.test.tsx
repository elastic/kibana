/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { monacoYamlSingletonObj, YamlEditor } from './yaml_editor';

// Mock the CodeEditor component
jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    CodeEditor: (props: any) => {
      // Use React from the outer scope
      const { useEffect } = jest.requireActual('react');
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
            onChange={(e) => onChange && onChange(e.target.value)}
          />
        </div>
      );
    },
  };
});

// Mock lodash debounce to execute immediately in tests
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: any) => fn,
}));

// Create a mock for monacoYaml
const mockDispose = jest.fn();
const mockUpdate = jest.fn();

// Mock the configureMonacoYamlSchema function
jest.mock('@kbn/monaco', () => ({
  configureMonacoYamlSchema: jest.fn(() =>
    Promise.resolve({
      dispose: mockDispose,
      update: mockUpdate,
    })
  ),
}));

describe('YamlEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispose.mockClear();
    mockUpdate.mockClear();
    // Reset singleton
    monacoYamlSingletonObj.singleton = null;
  });

  describe('monacoYaml singleton behavior', () => {
    it('should create singleton on mount and clear schemas on unmount', async () => {
      const onChange = jest.fn();
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

      // Verify that configureMonacoYamlSchema was called
      const monaco = jest.requireMock('@kbn/monaco');
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledWith(
        schemas,
        expect.objectContaining({
          completion: true,
          hover: false,
          validate: true,
        })
      );

      // Verify singleton was created
      expect(monacoYamlSingletonObj.singleton).not.toBeNull();

      // Unmount the component
      unmount();

      // Verify that update was called to clear schemas
      expect(mockUpdate).toHaveBeenCalledWith({
        completion: true,
        hover: false,
        validate: true,
        schemas: [],
      });

      // Verify singleton was cleared
      expect(monacoYamlSingletonObj.singleton).toBeNull();

      // Verify dispose was NOT called (singleton doesn't dispose on unmount)
      expect(mockDispose).not.toHaveBeenCalled();
    });

    it('should not update schemas if singleton was never initialized', () => {
      const onChange = jest.fn();

      // Mock configureMonacoYamlSchema to never resolve
      const monaco = jest.requireMock('@kbn/monaco');
      (monaco.configureMonacoYamlSchema as jest.Mock).mockReturnValue(new Promise(() => {}));

      // Render the component
      const { unmount } = render(
        <YamlEditor value="test: value" onChange={onChange} schemas={null} />
      );

      // Unmount the component immediately
      unmount();

      // Verify that update was not called since singleton was never initialized
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(monacoYamlSingletonObj.singleton).toBeNull();

      // Restore the mock
      (monaco.configureMonacoYamlSchema as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          dispose: mockDispose,
          update: mockUpdate,
        })
      );
    });

    it('should recreate singleton after unmount and remount', async () => {
      const onChange = jest.fn();
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

      // Verify monacoYaml was configured
      const monaco = jest.requireMock('@kbn/monaco');
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledTimes(1);
      const firstSingleton = monacoYamlSingletonObj.singleton;
      expect(firstSingleton).not.toBeNull();

      // Unmount - this clears the singleton
      unmount();

      // Verify singleton was cleared
      expect(monacoYamlSingletonObj.singleton).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        completion: true,
        hover: false,
        validate: true,
        schemas: [],
      });

      // Clear mocks
      mockUpdate.mockClear();
      monaco.configureMonacoYamlSchema.mockClear();

      // Remount - should create new singleton since previous was cleared
      const { unmount: unmount2 } = render(
        <YamlEditor value="test: value2" onChange={onChange} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify new singleton was created
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledTimes(1);
      expect(monacoYamlSingletonObj.singleton).not.toBeNull();
      expect(monacoYamlSingletonObj.singleton).not.toBe(firstSingleton); // Different instance

      // Unmount again
      unmount2();

      // Verify singleton cleared again
      expect(monacoYamlSingletonObj.singleton).toBeNull();
    });

    it('should clear singleton when any component unmounts', async () => {
      const onChange1 = jest.fn();
      const onChange2 = jest.fn();
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

      const firstSingleton = monacoYamlSingletonObj.singleton;
      expect(firstSingleton).not.toBeNull();

      // Mount second component while first is still mounted
      const { unmount: unmount2 } = render(
        <YamlEditor value="value2" onChange={onChange2} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both should use same singleton
      expect(monacoYamlSingletonObj.singleton).toBe(firstSingleton);
      expect(jest.requireMock('@kbn/monaco').configureMonacoYamlSchema).toHaveBeenCalledTimes(1);

      // Unmount first component - singleton is cleared immediately
      unmount1();
      expect(monacoYamlSingletonObj.singleton).toBeNull();

      // The second component still exists but singleton was already cleared
      // This is the current behavior - first unmount clears the singleton

      // Unmount second component
      unmount2();
      // Singleton remains null
      expect(monacoYamlSingletonObj.singleton).toBeNull();
    });

    it('should handle custom editorWillUnmount callback', async () => {
      const onChange = jest.fn();
      const customUnmount = jest.fn();
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
      expect(mockUpdate).toHaveBeenCalledWith({
        completion: true,
        hover: false,
        validate: true,
        schemas: [],
      });
    });
  });

  describe('schema updates', () => {
    it('should update singleton when schemas change', async () => {
      const onChange = jest.fn();
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
      expect(monacoYamlSingletonObj.singleton).not.toBeNull();

      // Clear mocks to track new calls
      mockUpdate.mockClear();

      // Update schemas
      rerender(<YamlEditor value="test: value" onChange={onChange} schemas={updatedSchemas} />);

      // Verify update was called with new schemas
      expect(mockUpdate).toHaveBeenCalledWith({
        completion: true,
        hover: false,
        validate: true,
        schemas: updatedSchemas,
      });
    });
  });

  describe('value and onChange behavior', () => {
    it('should update internal value and call onChange when text changes', () => {
      const onChange = jest.fn();
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
      const onChange = jest.fn();
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
});
