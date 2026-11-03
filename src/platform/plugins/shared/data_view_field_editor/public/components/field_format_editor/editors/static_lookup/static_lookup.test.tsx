/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { StaticLookupFormatEditorFormatParams } from './static_lookup';
import React from 'react';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen } from '@testing-library/react';
import { StaticLookupFormatEditor } from './static_lookup';

const fieldType = 'string';

const format = {
  convertToReact: jest.fn(),
};

const formatParams = {
  lookupEntries: [{}] as StaticLookupFormatEditorFormatParams['lookupEntries'],
  unknownKeyValue: '',
};

const onChange = jest.fn();
const onError = jest.fn();

const renderEditor = (params: StaticLookupFormatEditorFormatParams = formatParams) =>
  renderWithI18n(
    <StaticLookupFormatEditor
      fieldType={fieldType}
      format={format as unknown as FieldFormat}
      formatParams={params}
      onChange={onChange}
      onError={onError}
    />
  );

describe('StaticLookupFormatEditor', () => {
  it('should have a formatId', () => {
    expect(StaticLookupFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderEditor();

    expect(screen.getByText('Key')).toBeVisible();
    expect(screen.getByText('Value')).toBeVisible();
    expect(screen.getByTestId('staticLookupEditorKey 0')).toHaveValue('');
    expect(screen.getByTestId('staticLookupEditorValue 0')).toHaveValue('');
    expect(screen.getByTestId('staticLookupEditorAddEntry')).toHaveTextContent('Add entry');
    expect(screen.getByText('Value for unknown key')).toBeVisible();
    expect(screen.getByTestId('staticLookupEditorUnknownValue')).toHaveValue('');
  });

  it('should render multiple lookup entries and unknown key value', () => {
    renderEditor({
      lookupEntries: [{}, {}, {}] as StaticLookupFormatEditorFormatParams['lookupEntries'],
      unknownKeyValue: 'test value',
    });

    expect(screen.getAllByTestId(/^staticLookupEditorKey/)).toHaveLength(3);
    expect(screen.getAllByTestId(/^staticLookupEditorValue/)).toHaveLength(3);
    expect(screen.getByTestId('staticLookupEditorUnknownValue')).toHaveValue('test value');
  });

  it('should fire change with a new empty entry when an entry is added', () => {
    renderEditor();

    fireEvent.click(screen.getByTestId('staticLookupEditorAddEntry'));

    expect(onChange).toHaveBeenLastCalledWith({
      ...formatParams,
      lookupEntries: [{}, {}],
    });
  });

  it('should fire change when the key and the value of an entry are typed', () => {
    renderEditor();

    fireEvent.change(screen.getByTestId('staticLookupEditorKey 0'), {
      target: { value: 'look me up' },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...formatParams,
      lookupEntries: [{ key: 'look me up' }],
    });

    fireEvent.change(screen.getByTestId('staticLookupEditorValue 0'), {
      target: { value: 'looked up!' },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...formatParams,
      lookupEntries: [{ value: 'looked up!' }],
    });
  });

  it('should fire change when the value for an unknown key is typed', () => {
    renderEditor();

    fireEvent.change(screen.getByTestId('staticLookupEditorUnknownValue'), {
      target: { value: 'yes' },
    });

    expect(onChange).toHaveBeenLastCalledWith({ ...formatParams, unknownKeyValue: 'yes' });
  });
});
