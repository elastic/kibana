/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FieldFormatEditorFactory,
  FormatEditorProps as FieldFormatEditorProps,
} from './editors';
import React, { PureComponent } from 'react';
import { FormatEditor } from './format_editor';
import { render, screen } from '@testing-library/react';

type FormatEditorComponentProps = React.ComponentProps<typeof FormatEditor>;
type FieldFormatEditors = FormatEditorComponentProps['fieldFormatEditors'];

class TestEditor extends PureComponent<FieldFormatEditorProps<{}>> {
  static formatId = 'number';

  render() {
    return <div>Test editor</div>;
  }
}

const testEditorFactory: FieldFormatEditorFactory = Object.assign(async () => TestEditor, {
  formatId: TestEditor.formatId,
});

const createFormatEditors = (editorFactory?: FieldFormatEditorFactory): FieldFormatEditors => ({
  getAll: jest.fn(() => (editorFactory ? [editorFactory] : [])),
  getById: jest.fn(() => editorFactory) as FieldFormatEditors['getById'],
});

const defaultProps: FormatEditorComponentProps = {
  fieldFormat: {} as FormatEditorComponentProps['fieldFormat'],
  fieldFormatEditors: createFormatEditors(testEditorFactory),
  fieldFormatId: 'number',
  fieldFormatParams: {},
  fieldType: 'number',
  onChange: jest.fn(),
  onError: jest.fn(),
};

describe('FieldFormatEditor', () => {
  it('should render normally', async () => {
    const fieldFormatEditors = createFormatEditors(testEditorFactory);

    render(<FormatEditor {...defaultProps} fieldFormatEditors={fieldFormatEditors} />);

    expect(await screen.findByText('Test editor')).toBeVisible();
    expect(fieldFormatEditors.getById).toHaveBeenCalledWith('number');
  });

  it('should render nothing if there is no editor for the format', () => {
    const fieldFormatEditors = createFormatEditors();

    const { container } = render(
      <FormatEditor {...defaultProps} fieldFormatId="ip" fieldFormatEditors={fieldFormatEditors} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(fieldFormatEditors.getById).toHaveBeenCalledWith('ip');
  });
});
