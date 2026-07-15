/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DragContextValue } from './types';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { RootDragDropProvider, useDragDropContext } from '.';

describe('RootDragDropProvider', () => {
  it('reuses contexts for each render', () => {
    const contexts: DragContextValue[] = [];

    const TestComponent = ({ name }: { name: string }) => {
      const context = useDragDropContext();
      contexts.push(context);

      return <div>{`${name} ${context[0].dragging ? 'dragging' : 'idle'}`}</div>;
    };

    const RootComponent = ({ name }: { name: string }) => (
      <RootDragDropProvider>
        <TestComponent name={name} />
      </RootDragDropProvider>
    );

    const { rerender } = render(<RootComponent name="aaaa" />);

    expect(screen.getByText('aaaa idle')).toBeVisible();

    rerender(<RootComponent name="bbbb" />);

    expect(screen.getByText('bbbb idle')).toBeVisible();
    expect(contexts).toHaveLength(2);
    expect(contexts[0][0]).toBe(contexts[1][0]);
    expect(contexts[0][1]).toBe(contexts[1][1]);
  });
});
