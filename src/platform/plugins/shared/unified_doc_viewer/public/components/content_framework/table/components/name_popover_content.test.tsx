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
import { NamePopoverContent } from './name_popover_content';

describe('NamePopoverContent', () => {
  it('renders the field name', () => {
    render(
      <NamePopoverContent
        fieldName="myField"
        fieldConfig={{ name: 'myField', value: 'val', description: 'desc' }}
        cellActions={null}
      />
    );
    expect(screen.getByText('myField')).toBeInTheDocument();
  });

  it('renders the description if present', () => {
    render(
      <NamePopoverContent
        fieldName="fieldA"
        fieldConfig={{ name: 'fieldA', value: 'val', description: 'A description' }}
        cellActions={null}
      />
    );
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('does not render description if not present', () => {
    render(
      <NamePopoverContent
        fieldName="fieldB"
        fieldConfig={{ name: 'fieldB', value: 'val' }}
        cellActions={null}
      />
    );
    expect(screen.queryByText('desc')).not.toBeInTheDocument();
  });

  it('renders cellActions if provided', () => {
    render(
      <NamePopoverContent
        fieldName="fieldC"
        fieldConfig={{ name: 'fieldC', value: 'val', description: 'desc' }}
        cellActions={<button>ActionBtn</button>}
      />
    );
    expect(screen.getByText('ActionBtn')).toBeInTheDocument();
  });
});
