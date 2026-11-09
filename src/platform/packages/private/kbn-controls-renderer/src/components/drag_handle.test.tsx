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

import { DragHandle } from './drag_handle';

describe('DragHandle', () => {
  it('is a focusable button labelled with the control title', () => {
    render(<DragHandle isEditable controlTitle="Status" />);

    const handle = screen.getByRole('button', { name: 'Move control Status' });
    expect(handle).toHaveAttribute('tabindex', '0');
  });

  it('only renders its children when it is not editable', () => {
    render(
      <DragHandle isEditable={false} controlTitle="Status">
        <span>child</span>
      </DragHandle>
    );

    expect(screen.getByText('child')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
