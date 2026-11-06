/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { ListField } from './list_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'context',
      title: 'Workflow context',
      description: '',
      items: [
        {
          path: 'consts.tags',
          label: 'tags',
          typeLabel: 'string[]',
          drillable: false,
          originLabel: 'Workflow context',
        },
      ],
    },
  ],
};

const TEST_ID = 'list';

const renderList = (value: unknown, acceptsSingle = false) => {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <ListField
        value={value}
        onChange={onChange}
        acceptsSingle={acceptsSingle}
        catalog={catalog}
        ariaLabel="Ids"
        isInvalid={false}
        onBlur={jest.fn()}
        data-test-subj={TEST_ID}
      />
    </I18nProvider>
  );
  return { onChange, field: screen.getByTestId(TEST_ID) };
};

const addTag = (text: string) => {
  const input = within(screen.getByTestId(TEST_ID)).getByTestId('comboBoxSearchInput');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('ListField', () => {
  it('shows a reference tag as its expression with a type icon, and a plain tag as typed', () => {
    const { field } = renderList(['{{ consts.tags }}', 'static']);

    expect(field).toHaveTextContent('consts.tags');
    expect(field).toHaveTextContent('static');
    expect(field).not.toHaveTextContent('{{');
    // Only the reference carries a type icon.
    expect(field.querySelectorAll('.kbnFieldIcon')).toHaveLength(1);
  });

  it('shows both written forms of a reference the same way, and keeps them apart', () => {
    const { field } = renderList(['{{ consts.tags }}', '${{ consts.tags }}']);

    expect(field).not.toHaveTextContent('{{');
    expect(field).not.toHaveTextContent('$');
    expect(field.querySelectorAll('.kbnFieldIcon')).toHaveLength(2);
  });

  it('writes every tag back exactly as it was stored when the list changes', () => {
    const { onChange } = renderList(['{{ consts.tags }}', '${{ consts.tags }}', 'static']);

    addTag('extra');

    expect(onChange).toHaveBeenLastCalledWith([
      '{{ consts.tags }}',
      '${{ consts.tags }}',
      'static',
      'extra',
    ]);
  });

  it('removes the reference that was clicked, even when another has the same expression', () => {
    const { onChange } = renderList(['{{ consts.tags }}', '${{ consts.tags }}']);

    const [firstRemove] = screen.getAllByLabelText(/^Remove consts\.tags from selection/);
    fireEvent.click(firstRemove);

    expect(onChange).toHaveBeenLastCalledWith(['${{ consts.tags }}']);
  });

  it('leaves a reference inside a longer text as a plain tag', () => {
    const { field } = renderList(['logs-{{ inputs.env }}']);

    expect(field).toHaveTextContent('logs-{{ inputs.env }}');
    expect(field.querySelectorAll('.kbnFieldIcon')).toHaveLength(0);
  });

  it('says what a reference is and how it is written on hover, keeping the full expression', () => {
    const { field } = renderList(['{{ consts.tags }}', '${{ consts.tags }}']);

    const [text, value] = within(field).getAllByTestId('euiComboBoxPill');

    expect(text).toHaveAttribute('title', 'consts.tags\nstring[] · written as text');
    expect(value).toHaveAttribute(
      'title',
      'consts.tags\nstring[] · written as a value, so it keeps its type'
    );
  });

  it('leaves a plain tag with its own title', () => {
    const { field } = renderList(['static']);

    expect(within(field).getByTestId('euiComboBoxPill')).toHaveAttribute('title', 'static');
  });

  it('keeps a plain list as it was', () => {
    const { field, onChange } = renderList(['a', 'b']);

    expect(field).toHaveTextContent('a');
    expect(field.querySelectorAll('.kbnFieldIcon')).toHaveLength(0);
    addTag('c');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);
  });
});
