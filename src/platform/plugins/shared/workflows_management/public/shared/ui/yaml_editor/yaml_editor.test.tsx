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
import { YamlEditor } from '.'; // Import from index.ts which exports from yaml_editor

// Mock the CodeEditor component
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ languageId, value, onChange, ...props }: any) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };
    return (
      <div data-testid="code-editor">
        <textarea data-testid="code-editor-textarea" value={value || ''} onChange={handleChange} />
      </div>
    );
  },
}));

// Mock lodash debounce to execute immediately in tests
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: any) => fn,
}));

// Create a mock for monacoYaml with a dispose spy
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
  });

  describe('monacoYaml disposal', () => {
    it('should dispose monacoYaml instance when component unmounts', async () => {
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

      // Verify dispose hasn't been called yet
      expect(mockDispose).not.toHaveBeenCalled();

      // Unmount the component
      unmount();

      // Verify that dispose was called on unmount
      expect(mockDispose).toHaveBeenCalledTimes(1);
    });

    it('should not call dispose if monacoYaml was never initialized', () => {
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

      // Verify that dispose was not called since monacoYaml was never initialized
      expect(mockDispose).not.toHaveBeenCalled();

      // Restore the mock
      (monaco.configureMonacoYamlSchema as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          dispose: mockDispose,
          update: mockUpdate,
        })
      );
    });

    it('should dispose and recreate monacoYaml when remounting', async () => {
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

      // Unmount
      unmount();

      expect(mockDispose).toHaveBeenCalledTimes(1);
      mockDispose.mockClear();

      // Remount
      const { unmount: unmount2 } = render(
        <YamlEditor value="test: value2" onChange={onChange} schemas={schemas} />
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify monacoYaml was configured again
      const monaco = jest.requireMock('@kbn/monaco');
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledTimes(2);

      // Unmount again
      unmount2();

      // Verify dispose was called again
      expect(mockDispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('schema updates', () => {
    it('should update monacoYaml when schemas change', async () => {
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
      const monaco = jest.requireMock('@kbn/monaco');
      expect(monaco.configureMonacoYamlSchema).toHaveBeenCalledWith(
        initialSchemas,
        expect.any(Object)
      );

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
