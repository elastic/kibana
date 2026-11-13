/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KeyValueField } from './key_value_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

jest.mock('./reference_capable_field', () => ({
  ReferenceCapableField: ({ value }: { value: string }) => <span>{value}</span>,
}));

const catalog: DataReferenceCatalog = { groups: [] };

const field = (value: Record<string, unknown>) => (
  <I18nProvider>
    <KeyValueField
      value={value}
      onChange={jest.fn()}
      catalog={catalog}
      fieldLabel="Variable"
      addLabel="Add variable"
      testSubj="kv"
      renderJsonValue={() => <span />}
    />
  </I18nProvider>
);

/** The name input that currently holds `key`, wherever its row now sits. */
const nameInput = (key: string): HTMLElement => {
  const found = screen
    .getAllByRole('textbox')
    .find((input) => (input as HTMLInputElement).value === key);
  if (!found) throw new Error(`no row is named ${key}`);
  return found;
};

describe('KeyValueField when the map changes from outside (undo, YAML tab)', () => {
  it('shows the new values', () => {
    const { rerender } = render(field({ a: '1', b: '2' }));
    rerender(field({ a: '1', b: 'changed' }));
    expect(screen.getByText('changed')).toBeInTheDocument();
  });

  it('keeps the rows it already had mounted, so none of them loses its state', () => {
    const { rerender } = render(field({ a: '1', b: '2', c: '3' }));
    const before = [nameInput('a'), nameInput('b'), nameInput('c')];

    rerender(field({ a: '1', b: 'changed', c: '3' }));

    before.forEach((input, index) => expect(nameInput(['a', 'b', 'c'][index])).toBe(input));
  });

  it('keeps the focus in the row being edited when another row changes', () => {
    const { rerender } = render(field({ a: '1', b: '2' }));
    nameInput('b').focus();
    expect(document.activeElement).toBe(nameInput('b'));

    rerender(field({ a: 'changed', b: '2' }));

    expect(document.activeElement).toBe(nameInput('b'));
  });

  it('keeps each row when the order changes, moving it instead of rebuilding it', () => {
    const { rerender } = render(field({ a: '1', b: '2', c: '3' }));
    const a = nameInput('a');
    const c = nameInput('c');

    rerender(field({ c: '3', a: '1', b: '2' }));

    expect(nameInput('a')).toBe(a);
    expect(nameInput('c')).toBe(c);
    expect((screen.getAllByRole('textbox')[0] as HTMLInputElement).value).toBe('c');
  });

  it('adds a row for a new name and drops the row of a removed one, leaving the others alone', () => {
    const { rerender } = render(field({ a: '1', b: '2', c: '3' }));
    const a = nameInput('a');
    const c = nameInput('c');

    rerender(field({ a: '1', c: '3', d: '4' }));

    expect(nameInput('a')).toBe(a);
    expect(nameInput('c')).toBe(c);
    expect(nameInput('d')).toBeInTheDocument();
    expect(() => nameInput('b')).toThrow('no row is named b');
  });

  it('does not rebuild a row for a change that is only its own write coming back', () => {
    const { rerender } = render(field({ a: '1', b: '2' }));
    const a = nameInput('a');
    rerender(field({ a: '1', b: '2' }));
    expect(nameInput('a')).toBe(a);
  });
});
