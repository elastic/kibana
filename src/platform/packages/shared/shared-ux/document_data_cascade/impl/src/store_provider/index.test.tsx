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
import { DataCascadeProvider } from '.';

describe('DataCascadeProvider', () => {
  it('should render children', () => {
    render(
      <DataCascadeProvider cascadeGroups={[]}>
        <div>Test Child</div>
      </DataCascadeProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});
