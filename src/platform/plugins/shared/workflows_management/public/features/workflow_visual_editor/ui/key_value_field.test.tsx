/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { KeyValueJsonCellProps } from './key_value_field';
import { KeyValueField } from './key_value_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

// Each value cell stands for the reference-capable field of a row: it records every render by the
// value it was given, which is how the test sees which rows rendered.
const mockValueCellRenders: string[] = [];
jest.mock('./reference_capable_field', () => ({
  ReferenceCapableField: ({ value }: { value: string }) => {
    mockValueCellRenders.push(value);
    return <span>{value}</span>;
  },
}));

const catalog: DataReferenceCatalog = { groups: [] };

const renderJsonValue = jest.fn(() => <span data-test-subj="jsonCell" />);

function Harness({ initial }: { initial: Record<string, unknown> }) {
  const [value, setValue] = useState<Record<string, unknown>>(initial);
  return (
    <I18nProvider>
      <KeyValueField
        value={value}
        onChange={setValue}
        onDraftErrorChange={jest.fn()}
        catalog={catalog}
        fieldLabel="Variable"
        addLabel="Add variable"
        testSubj="kv"
        renderJsonValue={renderJsonValue}
      />
    </I18nProvider>
  );
}

describe('KeyValueField rows', () => {
  beforeEach(() => {
    mockValueCellRenders.length = 0;
    renderJsonValue.mockClear();
  });

  it('renders only the edited row when its name changes', () => {
    render(<Harness initial={{ one: 'value-one', two: 'value-two', three: 'value-three' }} />);
    mockValueCellRenders.length = 0;

    fireEvent.change(screen.getByTestId('kv-key-1'), { target: { value: 'twice' } });

    expect(screen.getByTestId('kv-key-1')).toHaveValue('twice');
    // The edited row renders again; the two others do not.
    expect(mockValueCellRenders).toEqual(['value-two']);
  });

  it('keeps the other rows idle over a burst of edits', () => {
    render(<Harness initial={{ one: 'value-one', two: 'value-two', three: 'value-three' }} />);
    mockValueCellRenders.length = 0;

    ['t', 'tw', 'two!', 'two!!'].forEach((name) => {
      fireEvent.change(screen.getByTestId('kv-key-1'), { target: { value: name } });
    });

    expect(mockValueCellRenders.every((value) => value === 'value-two')).toBe(true);
    expect(mockValueCellRenders).toHaveLength(4);
  });

  it('still writes the edit and follows the order of the rows', () => {
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <KeyValueField
          value={{ one: 'value-one', two: 'value-two' }}
          onChange={onChange}
          onDraftErrorChange={jest.fn()}
          catalog={catalog}
          fieldLabel="Variable"
          addLabel="Add variable"
          testSubj="kv"
          renderJsonValue={renderJsonValue}
        />
      </I18nProvider>
    );

    fireEvent.change(screen.getByTestId('kv-key-1'), { target: { value: 'second' } });

    expect(onChange).toHaveBeenLastCalledWith({ one: 'value-one', second: 'value-two' });
  });

  it('removes the row whose button was pressed, by its position at that time', () => {
    render(<Harness initial={{ one: 'value-one', two: 'value-two', three: 'value-three' }} />);

    fireEvent.click(screen.getByTestId('kv-remove-0'));

    expect(screen.queryByTestId('kv-key-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('kv-key-0')).toHaveValue('two');
    expect(screen.getByTestId('kv-key-1')).toHaveValue('three');
  });

  it('gives a value that is not text to the JSON renderer, and only such a row', () => {
    render(<Harness initial={{ text: 'plain', list: ['a', 'b'] }} />);

    expect(screen.getAllByTestId('jsonCell')).toHaveLength(1);
    expect(renderJsonValue).toHaveBeenCalledWith(
      expect.objectContaining({ value: ['a', 'b'], testSubj: 'kv-value-1' })
    );
  });
});

describe('KeyValueField draft error', () => {
  const renderCell = jest.fn((_props: KeyValueJsonCellProps) => <span data-test-subj="jsonCell" />);

  const setup = (initial: Record<string, unknown>) => {
    const onDraftErrorChange = jest.fn();
    const onChange = jest.fn();
    render(
      <I18nProvider>
        <KeyValueField
          value={initial}
          onChange={onChange}
          onDraftErrorChange={onDraftErrorChange}
          catalog={catalog}
          fieldLabel="Variable"
          addLabel="Add variable"
          testSubj="kv"
          renderJsonValue={renderCell}
        />
      </I18nProvider>
    );
    const lastError = () =>
      onDraftErrorChange.mock.calls[onDraftErrorChange.mock.calls.length - 1][0];
    return { onChange, lastError };
  };

  beforeEach(() => renderCell.mockClear());

  it('reports nothing for a clean map, nor for a row just added', () => {
    const { lastError } = setup({ one: 'value-one' });
    expect(lastError()).toBeUndefined();

    fireEvent.click(screen.getByTestId('kv-add'));
    expect(screen.getByTestId('kv-key-1')).toHaveValue('');
    expect(lastError()).toBeUndefined();
  });

  it('reports a repeated name, which is not written, until it is renamed', () => {
    const { lastError } = setup({ one: 'value-one', two: 'value-two' });

    fireEvent.change(screen.getByTestId('kv-key-1'), { target: { value: 'one' } });
    expect(lastError()).toBe('Names must be unique');

    fireEvent.change(screen.getByTestId('kv-key-1'), { target: { value: 'second' } });
    expect(lastError()).toBeUndefined();
  });

  it('reports a value left without a name, which is not written', () => {
    const { lastError } = setup({ one: 'value-one' });

    fireEvent.change(screen.getByTestId('kv-key-0'), { target: { value: '' } });
    expect(lastError()).toBe('Name every entry that has a value');

    fireEvent.change(screen.getByTestId('kv-key-0'), { target: { value: 'one' } });
    expect(lastError()).toBeUndefined();
  });

  it('reports a JSON cell that does not parse, and stops once its row is removed', () => {
    const { lastError } = setup({ text: 'plain', list: ['a'] });
    const [cell] = renderCell.mock.calls[0];

    act(() => cell.onDraftErrorChange('Must be valid JSON'));
    expect(lastError()).toBe('Must be valid JSON');

    fireEvent.click(screen.getByTestId('kv-remove-1'));
    expect(lastError()).toBeUndefined();
  });

  it('writes a row named __proto__ as an entry, not as a prototype', () => {
    const { onChange } = setup({ one: 'value-one' });

    fireEvent.change(screen.getByTestId('kv-key-0'), { target: { value: '__proto__' } });

    const [written] = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(Object.keys(written)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(written)).toBe(Object.prototype);
  });
});
