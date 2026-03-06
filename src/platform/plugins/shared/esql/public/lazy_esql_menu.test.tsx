/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@kbn/esql-editor', () => ({
  helpLabel: 'ES|QL help',
  ESQLMenu: () => <div data-test-subj="esql-menu-loaded">Loaded menu</div>,
  EsqlEditorActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./kibana_services', () => ({
  getKibanaServices: jest.fn(),
}));

import { ESQLMenu } from './lazy_esql_menu';
import { getKibanaServices } from './kibana_services';

const getKibanaServicesMock = getKibanaServices as jest.Mock;

describe('ESQLMenu', () => {
  afterEach(() => {
    getKibanaServicesMock.mockReset();
  });

  it('should render a disabled fallback button when services are not available', () => {
    getKibanaServicesMock.mockReturnValue(undefined);

    render(<ESQLMenu />);

    const button = screen.getByTestId('esql-help-popover-button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should render the lazy-loaded menu when services are available', async () => {
    getKibanaServicesMock.mockReturnValue({ core: {}, data: {} });

    render(<ESQLMenu />);

    await waitFor(() => {
      expect(screen.getByTestId('esql-menu-loaded')).toBeInTheDocument();
    });
  });
});
