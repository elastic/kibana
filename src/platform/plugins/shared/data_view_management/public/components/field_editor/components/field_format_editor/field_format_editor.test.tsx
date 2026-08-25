/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { FormatEditorServiceStart } from '@kbn/data-view-field-editor-plugin/public/service';
import { FieldFormatEditor } from './field_format_editor';
import { render, screen } from '@testing-library/react';
import React, { PureComponent } from 'react';

class TestEditor extends PureComponent {
  render = () => <div data-test-subj="test-editor">Test editor</div>;
}

const numberFormatEditorFactory = () => Promise.resolve(TestEditor);

const formatEditors: FormatEditorServiceStart['fieldFormatEditors'] = {
  getById: jest.fn((id: string) =>
    id === 'number' ? numberFormatEditorFactory : undefined
  ) as unknown as FormatEditorServiceStart['fieldFormatEditors']['getById'],
  getAll: jest.fn(() => []),
};

describe('FieldFormatEditor', () => {
  it('should render normally', async () => {
    render(
      <FieldFormatEditor
        fieldType="number"
        fieldFormat={{} as FieldFormat}
        fieldFormatId="number"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditors}
        onChange={() => {}}
        onError={() => {}}
      />
    );

    expect(formatEditors.getById).toHaveBeenCalledWith('number');
    expect(await screen.findByTestId('test-editor')).toBeVisible();
  });

  it('should render nothing if there is no editor for the format', async () => {
    render(
      <FieldFormatEditor
        fieldType="number"
        fieldFormat={{} as FieldFormat}
        fieldFormatId="ip"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditors}
        onChange={() => {}}
        onError={() => {}}
      />
    );

    expect(formatEditors.getById).toHaveBeenCalledWith('ip');
    expect(await screen.queryByTestId('test-editor')).not.toBeInTheDocument();
  });
});
