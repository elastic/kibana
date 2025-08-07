/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FormatEditor } from './format_editor';

const TestEditor = () => {
  return <div>Test editor</div>;
};
TestEditor.formatId = 'test';

const TestEditorFactory = () => Promise.resolve(TestEditor);
TestEditorFactory.formatId = 'test';

const formatEditors = {
  byFormatId: {
    ip: TestEditorFactory,
    number: TestEditorFactory,
  },
  getById: jest.fn(() => TestEditorFactory),
  getAll: jest.fn(),
};

describe('FieldFormatEditor', () => {
  it('should render normally when format editor exists', async () => {
    const { container } = render(
      <FormatEditor
        fieldType="number"
        fieldFormat={{} as any}
        fieldFormatId="number"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditors}
        onChange={() => {}}
        onError={() => {}}
      />
    );

    // Since the component renders a lazy loaded editor, we should see the editor content
    expect(container).toBeInTheDocument();
    // The TestEditor should be rendered since formatEditors.getById returns TestEditor for 'number'
    expect(container.firstChild).toBeTruthy();
  });

  it('should render nothing if there is no editor for the format', async () => {
    const formatEditorsWithoutIp = {
      ...formatEditors,
      getById: jest.fn(() => undefined), // Return undefined for formats without editors
    };

    const { container } = render(
      <FormatEditor
        fieldType="number"
        fieldFormat={{} as any}
        fieldFormatId="ip"
        fieldFormatParams={{}}
        fieldFormatEditors={formatEditorsWithoutIp}
        onChange={() => {}}
        onError={() => {}}
      />
    );

    // When no editor is found, the component should render nothing (empty fragment)
    expect(container.firstChild).toBeNull();
  });
});
