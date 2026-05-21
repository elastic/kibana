/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CodeEditorProps } from '@kbn/code-editor';
import JsonCodeEditor from './json_code_editor';
import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');

  const CodeEditorMock = (props: CodeEditorProps) => (
    <pre data-test-subj="mockCodeEditor">{props.value}</pre>
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

describe('JsonCodeEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the `JsonCodeEditor` component', () => {
    const value = {
      _index: 'test',
      _type: 'doc',
      _id: 'foo',
      _score: 1,
      _source: { test: 123 },
    };

    renderWithI18n(<JsonCodeEditor json={value} />);

    const editor = screen.getByTestId('mockCodeEditor');
    expect(editor).toBeVisible();
    expect(editor.textContent).toBe(JSON.stringify(value, null, 2));
  });
});
