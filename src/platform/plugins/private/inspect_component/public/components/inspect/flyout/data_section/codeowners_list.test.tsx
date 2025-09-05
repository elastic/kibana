/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { CodeownersList } from './codeowners_list';

const mockCodeowners = ['@elastic/team-capybara'];

describe('CodeownersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    renderWithI18n(<CodeownersList codeowners={mockCodeowners} />);

    const codeownersList = screen.getByTestId('inspectFlyoutCodeownersList');

    expect(codeownersList).toBeInTheDocument();
  });

  it('should not render when codeowners is an empty array', () => {
    const emptyCodeownersMock: string[] = [];

    renderWithI18n(<CodeownersList codeowners={emptyCodeownersMock} />);

    const codeownersList = screen.queryByTestId('inspectFlyoutCodeownersList');

    expect(codeownersList).not.toBeInTheDocument();
  });

  it('should generate correct link', () => {
    renderWithI18n(<CodeownersList codeowners={mockCodeowners} />);

    const codeownersList = screen.getByTestId('inspectFlyoutCodeownersList');

    expect(codeownersList).toBeInTheDocument();

    const codeownerLink = screen.getByRole('link', { name: /@elastic\/team-capybara/i });

    expect(codeownerLink).toHaveAttribute(
      'href',
      'https://github.com/orgs/elastic/teams/team-capybara'
    );
  });
});
