/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  // eslint-disable-next-line no-restricted-imports
  Router as ReactRouter,
  MemoryRouter as ReactMemoryRouter,
  BrowserRouter as ReactBrowserRouter,
  HashRouter as ReactHashRouter,
} from 'react-router-dom';
import type {
  RouterProps,
  MemoryRouterProps,
  BrowserRouterProps,
  HashRouterProps,
} from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';

export const HashRouter = ({ children, ...props }: HashRouterProps) => (
  <ReactHashRouter {...props}>
    <CompatRouter>{children}</CompatRouter>
  </ReactHashRouter>
);

export const BrowserRouter = ({ children, ...props }: BrowserRouterProps) => (
  <ReactBrowserRouter {...props}>
    <CompatRouter>{children}</CompatRouter>
  </ReactBrowserRouter>
);

export const MemoryRouter = ({ children, ...props }: MemoryRouterProps) => (
  <ReactMemoryRouter {...props}>
    <CompatRouter>{children}</CompatRouter>
  </ReactMemoryRouter>
);

export const Router = ({ children, ...props }: RouterProps) => (
  <ReactRouter {...props}>
    <CompatRouter>{children}</CompatRouter>
  </ReactRouter>
);
