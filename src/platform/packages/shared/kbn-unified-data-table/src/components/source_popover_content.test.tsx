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
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import { SourcePopoverContent } from './source_popover_content';

const mockJsonCodeEditor = jest.fn((_props: Record<string, unknown>) => null);

jest.mock('./json_code_editor/json_code_editor', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockJsonCodeEditor(props),
}));

const rawHit = {
  _id: 'abc',
  _index: 'my-index',
  _source: { foo: 'bar', nested: { baz: 42 } },
};

const closeButton = <button />;

const renderPopover = (props: {
  row: DataTableRecord;
  isPlainRecord: boolean;
  useTopLevelObjectColumns?: boolean;
}) =>
  render(
    <SourcePopoverContent
      closeButton={closeButton}
      columnId="_source"
      row={props.row}
      useTopLevelObjectColumns={props.useTopLevelObjectColumns ?? false}
      isPlainRecord={props.isPlainRecord}
    />
  );

const getRenderedJson = () =>
  (mockJsonCodeEditor.mock.calls.at(-1)?.[0] as unknown as { json: unknown })?.json;

describe('SourcePopoverContent', () => {
  beforeEach(() => {
    mockJsonCodeEditor.mockClear();
  });

  it('renders the full raw hit when not in ES|QL mode', () => {
    const row = {
      id: 'abc',
      raw: rawHit,
      flattened: { foo: 'bar', 'nested.baz': 42 },
    } as unknown as DataTableRecord;

    renderPopover({ row, isPlainRecord: false });

    expect(getRenderedJson()).toEqual(rawHit);
  });

  it('renders only the _source value in ES|QL mode when available', () => {
    const source = { foo: 'bar', nested: { baz: 42 } };
    const row = {
      id: 'abc',
      raw: rawHit,
      flattened: { _source: source, _id: 'abc' },
    } as unknown as DataTableRecord;

    renderPopover({ row, isPlainRecord: true });

    expect(getRenderedJson()).toEqual(source);
  });

  it('falls back to raw hit in ES|QL mode when _source is not present', () => {
    const row = {
      id: 'abc',
      raw: rawHit,
      flattened: { foo: 'bar' },
    } as unknown as DataTableRecord;

    renderPopover({ row, isPlainRecord: true });

    expect(getRenderedJson()).toEqual(rawHit);
  });
});
