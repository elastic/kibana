/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@kbn/code-editor-mock/jest_helper';
import JsonCodeEditor from './json_code_editor';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('JsonCodeEditor', () => {
  it('returns the `JsonCodeEditor` component', () => {
    const value = {
      _index: 'test',
      _type: 'doc',
      _id: 'foo',
      _score: 1,
      _source: { test: 123 },
    };
    render(<JsonCodeEditor json={value} />);

    const editor = screen.getByLabelText('Read only JSON view of an elasticsearch document');

    expect(editor).toHaveValue(JSON.stringify(value, null, 2));
    expect(screen.queryByText('Copy to clipboard')).not.toBeInTheDocument();
  });
});
