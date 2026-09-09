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

export const HashRouter = ({ children, ...props }: HashRouterProps) => (
  <ReactHashRouter {...props}>{children}</ReactHashRouter>
);

export const BrowserRouter = ({ children, ...props }: BrowserRouterProps) => (
  <ReactBrowserRouter {...props}>{children}</ReactBrowserRouter>
);

export const MemoryRouter = ({ children, ...props }: MemoryRouterProps) => (
  <ReactMemoryRouter {...props}>{children}</ReactMemoryRouter>
);

export const Router = ({ children, ...props }: RouterProps) => (
  <ReactRouter {...props}>{children}</ReactRouter>
);
