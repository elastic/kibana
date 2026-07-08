/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProjectPickerButton } from './button';

describe('CPSButton', () => {
  it('should render the button with text showing the number of filtered projects and the total number of projects', () => {
    render(
      <ProjectPickerButton
        onClick={() => {}}
        size="s"
        filteredProjectsCount={1000}
        totalProjectsCount={10000}
      />
    );
    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('1k/10k');
  });

  it('should render the button with text showing "All" when all projects are selected', () => {
    render(
      <ProjectPickerButton
        onClick={() => {}}
        size="s"
        filteredProjectsCount={10000}
        totalProjectsCount={10000}
      />
    );
    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('All');
  });
});
