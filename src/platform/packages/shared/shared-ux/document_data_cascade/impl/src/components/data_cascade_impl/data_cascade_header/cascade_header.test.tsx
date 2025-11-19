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
import { DataCascadeProvider } from '../../../store_provider';
import { CascadeHeaderPrimitive } from './cascade_header';

describe('CascadeHeaderPrimitive', () => {
  it('renders the table title with the default group selector when the `tableTitleSlot` props is provided', () => {
    render(
      <DataCascadeProvider cascadeGroups={['group1', 'group2']} initialGroupColumn={['group1']}>
        <CascadeHeaderPrimitive
          id="test-id"
          tableInstance={null as any} // Ignored in test
          tableTitleSlot={() => <div>Table Title</div>}
          onCascadeGroupingChange={jest.fn()}
        />
      </DataCascadeProvider>
    );

    expect(screen.getByText('Table Title')).toBeInTheDocument();
  });

  it('renders the custom table header when the `customTableHeader` prop is provided', () => {
    render(
      <DataCascadeProvider cascadeGroups={['group1', 'group2']} initialGroupColumn={['group1']}>
        <CascadeHeaderPrimitive
          id="test-id"
          tableInstance={null as any} // Ignored in test
          customTableHeader={(props) => (
            <div>Custom Header - Selected: {props.currentSelectedColumns.join(', ')}</div>
          )}
          tableTitleSlot={() => <div>Table Title</div>}
          onCascadeGroupingChange={jest.fn()}
        />
      </DataCascadeProvider>
    );

    expect(screen.getByText('Custom Header - Selected: group1')).toBeInTheDocument();
  });
});
