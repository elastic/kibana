/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock the code editor component
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value }: { value: string }) => <div data-test-subj="codeEditor">{value}</div>,
}));

// Mock Monaco editor
jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      create: jest.fn(),
      defineTheme: jest.fn(),
      setTheme: jest.fn(),
    },
    languages: {
      register: jest.fn(),
      setMonarchTokensProvider: jest.fn(),
      setLanguageConfiguration: jest.fn(),
    },
  },
  XJsonLang: 'json',
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  toMountPoint: jest.fn((element) => element),
}));

import React from 'react';
import { render } from '@testing-library/react';
import JsonCodeEditor from './json_code_editor';

it('returns the `JsonCodeEditor` component', () => {
  const value = {
    _index: 'test',
    _type: 'doc',
    _id: 'foo',
    _score: 1,
    _source: { test: 123 },
  };
  const { container } = render(<JsonCodeEditor json={value} />);
  expect(container.firstChild).toMatchSnapshot();
});
