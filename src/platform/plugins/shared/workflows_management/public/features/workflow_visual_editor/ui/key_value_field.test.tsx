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
