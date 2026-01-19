/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValuePopoverContent } from './value_popover_content';
import type { TableFieldConfiguration } from '..';

const defaultFieldConfig: TableFieldConfiguration = {
  value: 'fieldValue',
  name: 'fieldName',
  valueCellContent: () => <span>Default Cell Value</span>,
};

describe('ValuePopoverContent', () => {
  it('renders the valueCellContent', () => {
    render(
      <ValuePopoverContent
        fieldConfig={{ ...defaultFieldConfig, valueCellContent: () => <span>Cell Value</span> }}
        cellActions={null}
      />
    );
    expect(screen.getByText('Cell Value')).toBeInTheDocument();
  });

  it('renders cellActions if provided', () => {
    render(
      <ValuePopoverContent
        fieldConfig={{ ...defaultFieldConfig, valueCellContent: () => <span>With Action</span> }}
        cellActions={<button>ActionBtn</button>}
      />
    );
    expect(screen.getByText('ActionBtn')).toBeInTheDocument();
  });
});
