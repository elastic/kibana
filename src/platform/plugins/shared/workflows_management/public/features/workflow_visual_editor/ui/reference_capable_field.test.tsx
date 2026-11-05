/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ReferenceCapableField } from './reference_capable_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

jest.mock('./data_reference_picker', () => ({
  DataReferencePicker: ({
    isOpen,
    onInsert,
    input,
  }: {
    isOpen: boolean;
    onInsert: (token: string) => void;
    input: React.ReactElement;
  }) => (
    <div>
      {input}
      {isOpen ? (
        <button type="button" data-test-subj="mockInsert" onClick={() => onInsert('{{ event.a }}')}>
          insert
        </button>
      ) : null}
    </div>
  ),
}));

const catalog: DataReferenceCatalog = { groups: [] };

function Harness({
  initialValue = 'hello',
  valueFormWhenWhole,
}: {
  initialValue?: string;
  valueFormWhenWhole?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <I18nProvider>
      <ReferenceCapableField
        catalog={catalog}
        value={value}
        onChange={setValue}
        valueFormWhenWhole={valueFormWhenWhole}
      >
        {({ value: textValue, reportChange, attachInputRef, togglePicker }) => (
          <>
            <input
              data-test-subj="field"
              value={textValue}
              ref={attachInputRef}
              onChange={(e) => {
                reportChange(e.target.value, e.target.selectionStart ?? e.target.value.length);
              }}
            />
            <button type="button" data-test-subj="open" onClick={togglePicker}>
              open
            </button>
          </>
        )}
      </ReferenceCapableField>
    </I18nProvider>
  );
}

describe('ReferenceCapableField insert undo', () => {
  it('inserts via execCommand so the browser undo stack can revert it', () => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    render(<Harness />);

    const field = screen.getByTestId('field') as HTMLInputElement;
    field.focus();
    field.setSelectionRange(5, 5);

    fireEvent.click(screen.getByTestId('open'));
    fireEvent.click(screen.getByTestId('mockInsert'));

    expect(execCommand).toHaveBeenCalledWith('insertText', false, '{{ event.a }}');
  });
});

describe('ReferenceCapableField value form when the pick fills the field', () => {
  const insertedText = (initialValue: string, caret: number, valueFormWhenWhole?: boolean) => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(<Harness initialValue={initialValue} valueFormWhenWhole={valueFormWhenWhole} />);
    const field = screen.getByTestId('field') as HTMLInputElement;
    field.focus();
    field.setSelectionRange(caret, caret);
    fireEvent.click(screen.getByTestId('open'));
    fireEvent.click(screen.getByTestId('mockInsert'));
    return execCommand.mock.calls[0]?.[2];
  };

  it('writes a whole reference as a value into an empty field', () => {
    expect(insertedText('', 0, true)).toBe('${{ event.a }}');
  });

  it('treats a field with only spaces as empty', () => {
    expect(insertedText('  ', 1, true)).toBe('${{ event.a }}');
  });

  it('keeps the text form when the field already holds text', () => {
    expect(insertedText('status : ', 9, true)).toBe('{{ event.a }}');
  });

  it('keeps the text form when the option is off', () => {
    expect(insertedText('', 0)).toBe('{{ event.a }}');
  });
});
