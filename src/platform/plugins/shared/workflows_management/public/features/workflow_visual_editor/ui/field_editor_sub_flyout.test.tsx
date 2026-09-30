/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { FieldEditorSubFlyout } from './field_editor_sub_flyout';

jest.mock('./data_reference_catalog_tree', () => ({
  DataReferenceCatalogTree: () => <div data-test-subj="workflowDataReferenceCatalogTree" />,
}));

jest.mock('./reference_capable_field', () => ({
  ReferenceCapableField: ({
    children,
    onChange,
  }: {
    children: (bind: {
      teachingPlaceholder: string;
      appendControls: null;
      reportChange: (next: string, caret: number) => void;
      attachInputRef: (el: HTMLTextAreaElement | null) => void;
      isOpen: boolean;
    }) => React.ReactElement;
    value: string;
    onChange: (next: string) => void;
  }) =>
    children({
      teachingPlaceholder: 'Type @',
      appendControls: null,
      reportChange: (next) => onChange(next),
      attachInputRef: () => undefined,
      isOpen: false,
    }),
}));

const catalog: DataReferenceCatalog = { groups: [] };

describe('FieldEditorSubFlyout', () => {
  it('Back / Escape close only the child; ✕ closes the whole stack', () => {
    const onBack = jest.fn();
    const onCloseStack = jest.fn();
    const onChange = jest.fn();

    render(
      <I18nProvider>
        <FieldEditorSubFlyout
          fieldLabel="Message"
          value="hi"
          onChange={onChange}
          catalog={catalog}
          onBack={onBack}
          onCloseStack={onCloseStack}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutBack'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onCloseStack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutClose'));
    expect(onCloseStack).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('loads the field value and accepts typing with live write-through', () => {
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <FieldEditorSubFlyout
          fieldLabel="Connector"
          value={'{\n  "id": "x"\n}'}
          onChange={onChange}
          catalog={catalog}
          language="json"
          onBack={jest.fn()}
          onCloseStack={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('workflowFieldEditorSubFlyoutValueLabel')).toHaveTextContent(
      'Value'
    );
    expect(screen.getByTestId('workflowFieldEditorSubFlyoutValueDescription')).toHaveTextContent(
      'Drag a reference in, or type @ / {{'
    );

    const textarea = screen.getByTestId(
      'workflowFieldEditorSubFlyoutTextarea'
    ) as HTMLTextAreaElement;
    expect(textarea).toHaveValue('{\n  "id": "x"\n}');
    expect(screen.queryByTestId('workflowFieldEditorSubFlyoutFooter')).not.toBeInTheDocument();

    fireEvent.change(textarea, {
      target: { value: '{"id":"y"}', selectionStart: 9, selectionEnd: 9 },
    });
    expect(onChange).toHaveBeenCalledWith('{"id":"y"}');
  });

  it('scopes Cmd/Ctrl+Z undo and redo to the field editor draft', () => {
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <FieldEditorSubFlyout
          fieldLabel="Message"
          value="one"
          onChange={onChange}
          catalog={catalog}
          onBack={jest.fn()}
          onCloseStack={jest.fn()}
        />
      </I18nProvider>
    );

    const textarea = screen.getByTestId(
      'workflowFieldEditorSubFlyoutTextarea'
    ) as HTMLTextAreaElement;

    fireEvent.change(textarea, {
      target: { value: 'two', selectionStart: 3, selectionEnd: 3 },
    });
    fireEvent.change(textarea, {
      target: { value: 'three', selectionStart: 5, selectionEnd: 5 },
    });
    expect(textarea).toHaveValue('three');

    fireEvent.keyDown(textarea, { key: 'z', metaKey: true });
    expect(textarea).toHaveValue('two');
    expect(onChange).toHaveBeenLastCalledWith('two');

    fireEvent.keyDown(textarea, { key: 'z', metaKey: true });
    expect(textarea).toHaveValue('one');

    fireEvent.keyDown(textarea, { key: 'z', metaKey: true, shiftKey: true });
    expect(textarea).toHaveValue('two');

    fireEvent.keyDown(textarea, { key: 'y', ctrlKey: true });
    expect(textarea).toHaveValue('three');
  });
});
