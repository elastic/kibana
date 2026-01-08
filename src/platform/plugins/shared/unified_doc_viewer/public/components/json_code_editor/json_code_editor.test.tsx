/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import JsonCodeEditor from './json_code_editor';
import { JsonCodeEditorCommon } from './json_code_editor_common';
import { render, screen } from '@testing-library/react';

jest.mock('./json_code_editor_common', () => ({
  JsonCodeEditorCommon: jest.fn(() => <div data-test-subj="jsonCodeEditorCommon" />),
}));

const mockedJsonCodeEditorCommon = jest.mocked(JsonCodeEditorCommon);

describe('JsonCodeEditor', () => {
  beforeEach(() => {
    mockedJsonCodeEditorCommon.mockClear();
  });

  it('passes formatted JSON and props to JsonCodeEditorCommon', () => {
    const jsonValue = {
      _index: 'test',
      _type: 'doc',
      _id: 'foo',
      _score: 1,
      _source: { test: 123 },
    };

    render(<JsonCodeEditor json={jsonValue} width="100%" height={200} hasLineNumbers />);

    expect(screen.getByTestId('jsonCodeEditorCommon')).toBeVisible();
    expect(mockedJsonCodeEditorCommon).toHaveBeenCalledWith(
      expect.objectContaining({
        hasLineNumbers: true,
        height: 200,
        hideCopyButton: true,
        jsonValue: JSON.stringify(jsonValue, null, 2),
        onEditorDidMount: expect.any(Function),
        width: '100%',
      }),
      {}
    );
  });
});
