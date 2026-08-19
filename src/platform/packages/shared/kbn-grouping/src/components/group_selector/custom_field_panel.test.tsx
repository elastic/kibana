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
import { CustomFieldPanel } from './custom_field_panel';

const baseFields = [
  {
    name: 'host.name',
    type: 'string',
    aggregatable: true,
    searchable: true,
    esTypes: ['keyword'],
  },
  {
    name: 'source.ip',
    type: 'ip',
    aggregatable: true,
    searchable: true,
    esTypes: ['ip'],
  },
  {
    name: 'destination.ip',
    type: 'ip',
    aggregatable: true,
    searchable: true,
    esTypes: ['ip'],
  },
  {
    name: 'process.pid',
    type: 'number',
    aggregatable: true,
    searchable: true,
    esTypes: ['long'],
  },
  {
    name: 'source.bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
    esTypes: ['long'],
  },
  {
    name: 'source.ip.not_aggregatable',
    type: 'ip',
    aggregatable: false,
    searchable: false,
    esTypes: ['ip'],
  },
];

const openCombobox = () => {
  fireEvent.click(screen.getByRole('combobox'));
};

describe('CustomFieldPanel field type filtering', () => {
  it('shows string and ip fields, excludes number and non-aggregatable fields by default', () => {
    render(<CustomFieldPanel fields={baseFields} currentOptions={[]} onSubmit={jest.fn()} />);
    openCombobox();

    expect(screen.getByText('host.name')).toBeInTheDocument();
    expect(screen.getByText('source.ip')).toBeInTheDocument();
    expect(screen.getByText('destination.ip')).toBeInTheDocument();
    expect(screen.queryByText('process.pid')).not.toBeInTheDocument();
    expect(screen.queryByText('source.bytes')).not.toBeInTheDocument();
    expect(screen.queryByText('source.ip.not_aggregatable')).not.toBeInTheDocument();
  });

  it('respects a custom allowedFieldTypes prop', () => {
    render(
      <CustomFieldPanel
        fields={baseFields}
        currentOptions={[]}
        onSubmit={jest.fn()}
        allowedFieldTypes={['number']}
      />
    );
    openCombobox();

    expect(screen.getByText('process.pid')).toBeInTheDocument();
    expect(screen.getByText('source.bytes')).toBeInTheDocument();
    expect(screen.queryByText('host.name')).not.toBeInTheDocument();
    expect(screen.queryByText('source.ip')).not.toBeInTheDocument();
  });

  it('excludes already-selected options', () => {
    render(
      <CustomFieldPanel
        fields={baseFields}
        currentOptions={[{ text: 'Source IP', field: 'source.ip' }]}
        onSubmit={jest.fn()}
      />
    );
    openCombobox();

    expect(screen.getByText('destination.ip')).toBeInTheDocument();
    expect(screen.queryByText('source.ip')).not.toBeInTheDocument();
  });
});
