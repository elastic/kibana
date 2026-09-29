/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import { ProfilesInspectorView } from './profiles_inspector_view';
import React from 'react';
import { getRootContextMock, getDataSourceContextMock } from '../../__mocks__';
import type { ContextsAdapter } from '../../hooks';

const mockContextsAdapter: ContextsAdapter = {
  getRootContext: vi.fn().mockReturnValue(getRootContextMock()),
  getDataSourceContext: vi.fn().mockReturnValue(getDataSourceContextMock()),
  getDocumentContexts: vi.fn().mockReturnValue({}),
  openDocDetails: vi.fn(),
};

const setup = () => {
  render(<ProfilesInspectorView contextsAdapter={mockContextsAdapter} />);
};

describe('<ProfilesInspectorView />', () => {
  it('renders the root profile section', () => {
    setup();
    expect(screen.getByText('Root profile')).toBeVisible();
  });

  it('renders the data source profile section', () => {
    setup();
    expect(screen.getByText('Data source profile')).toBeVisible();
  });

  it('renders the documents profiles section', () => {
    setup();
    expect(screen.getByText('Document profiles')).toBeVisible();
  });
});
