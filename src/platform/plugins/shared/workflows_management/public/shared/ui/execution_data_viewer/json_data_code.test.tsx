/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { JsonDataCode } from './json_data_code';

// Mock the JSONCodeEditorCommonMemoized component to inspect the props it receives
const mockJSONCodeEditorCommonMemoized = jest.fn();

jest.mock('./json_editor_common', () => ({
  JSONCodeEditorCommonMemoized: (props: Record<string, unknown>) => {
    mockJSONCodeEditorCommonMemoized(props);
    return (
      <div data-test-subj={props['data-test-subj'] as string}>{props.jsonValue as string}</div>
    );
  },
}));

describe('JsonDataCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the formatted JSON string', () => {
    const json = { name: 'test', value: 123 };
    render(<JsonDataCode json={json} />);

    expect(screen.getByTestId('workflowStepResultJsonEditor')).toBeInTheDocument();
  });

  it('passes correctly formatted JSON to the editor', () => {
    const json = { name: 'test', value: 123 };
    render(<JsonDataCode json={json} />);

    expect(mockJSONCodeEditorCommonMemoized).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonValue: JSON.stringify(json, null, 2),
      })
    );
  });

  it('passes hasLineNumbers and enableFindAction props', () => {
    render(<JsonDataCode json={{ key: 'value' }} />);

    expect(mockJSONCodeEditorCommonMemoized).toHaveBeenCalledWith(
      expect.objectContaining({
        hasLineNumbers: true,
        enableFindAction: true,
        height: '100%',
      })
    );
  });

  it('handles null JSON value', () => {
    render(<JsonDataCode json={null} />);

    expect(mockJSONCodeEditorCommonMemoized).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonValue: 'null',
      })
    );
  });

  it('handles array JSON value', () => {
    const json = [1, 2, 3];
    render(<JsonDataCode json={json} />);

    expect(mockJSONCodeEditorCommonMemoized).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonValue: JSON.stringify(json, null, 2),
      })
    );
  });

  it('handles string JSON value', () => {
    render(<JsonDataCode json="hello" />);

    expect(mockJSONCodeEditorCommonMemoized).toHaveBeenCalledWith(
      expect.objectContaining({
        jsonValue: '"hello"',
      })
    );
  });

  it('passes an empty onEditorDidMount callback', () => {
    render(<JsonDataCode json={{ key: 'value' }} />);

    const { onEditorDidMount } = mockJSONCodeEditorCommonMemoized.mock.calls[0][0];
    expect(typeof onEditorDidMount).toBe('function');
    // Should not throw when called
    expect(() => onEditorDidMount()).not.toThrow();
  });
});
