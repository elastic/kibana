/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import faker from 'faker';
import { RenderOptions, render } from '@testing-library/react';
import { DragContextState, RootDragDropProvider } from './providers';

export const EXACT = {
  exact: true,
};

export const dataTransfer = {
  setData: jest.fn(),
  getData: jest.fn(),
};

export const generateDragDropValue = (label = faker.lorem.word()) => ({
  id: faker.random.uuid(),
  humanData: {
    label,
    groupLabel: faker.lorem.word(),
    position: 1,
    canSwap: true,
    canDuplicate: true,
    layerNumber: 0,
  },
});

export const renderWithDragDropContext = (
  ui: ReactElement,
  renderOptions?: RenderOptions,
  contextStateOverrides: Partial<DragContextState> = {}
): any => {
  const { wrapper, ...options } = renderOptions || {};

  const Wrapper: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return (
      <RootDragDropProvider initialState={contextStateOverrides}>{children}</RootDragDropProvider>
    );
  };

  const rtlRender = render(ui, { wrapper: Wrapper, ...options });

  return {
    ...rtlRender,
  };
};
