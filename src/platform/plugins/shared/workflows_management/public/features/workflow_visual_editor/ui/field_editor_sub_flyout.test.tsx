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

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiFlyout: ({
      children,
      onClose,
      'data-test-subj': dataTestSubj,
    }: {
      children: React.ReactNode;
      onClose: (event?: unknown, meta?: { reason?: string }) => void;
      'data-test-subj'?: string;
    }) => (
      <div data-test-subj={dataTestSubj}>
        <button
          type="button"
          data-test-subj="mockFlyoutBack"
          onClick={() => onClose(undefined, { reason: 'escape' })}
        >
          Back
        </button>
        <button
          type="button"
          data-test-subj="mockFlyoutCloseStack"
          onClick={() => onClose(undefined, { reason: 'close-button' })}
        >
          Close stack
        </button>
        {children}
      </div>
    ),
  };
});

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

    fireEvent.click(screen.getByTestId('mockFlyoutBack'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onCloseStack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('mockFlyoutCloseStack'));
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
});
