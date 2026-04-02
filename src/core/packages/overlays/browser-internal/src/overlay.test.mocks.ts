/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

export const mockReactDomRender = jest.fn();
export const mockReactDomUnmount = jest.fn();
export const mockReactDomCreatePortal = jest.fn().mockImplementation((component) => component);
export const mockReactDomFlushSync = jest.fn((callback: () => void) => callback());
export const mockReactDomCreateRoot = jest.fn().mockImplementation((container) => ({
  render: (component: ReactNode) => mockReactDomRender(component, container),
  unmount: () => mockReactDomUnmount(container),
}));

jest.doMock('react-dom', () => ({
  render: mockReactDomRender,
  createPortal: mockReactDomCreatePortal,
  flushSync: mockReactDomFlushSync,
  unmountComponentAtNode: mockReactDomUnmount,
}));

jest.doMock('react-dom/client', () => ({
  createRoot: mockReactDomCreateRoot,
}));
