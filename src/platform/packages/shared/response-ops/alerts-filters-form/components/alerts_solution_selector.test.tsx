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
import { AlertsSolutionSelector } from './alerts_solution_selector';
import { SOLUTION_SELECTOR_SUBJ } from '../constants';
import userEvent from '@testing-library/user-event';
import { RuleTypeSolution } from '@kbn/alerting-types';

const availableSolutions: RuleTypeSolution[] = ['observability', 'stack', 'security'];

describe('AlertsSolutionSelector', () => {
  it('should render the available options in a select', async () => {
    render(
      <AlertsSolutionSelector
        availableSolutions={availableSolutions}
        solution={undefined}
        onSolutionChange={jest.fn()}
      />
    );
    expect(screen.queryByTestId(SOLUTION_SELECTOR_SUBJ)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('Observability')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Stack')).toBeInTheDocument();
  });

  it('should call onSolutionChange with the selected solution', async () => {
    const onSolutionChange = jest.fn();
    render(
      <AlertsSolutionSelector
        availableSolutions={availableSolutions}
        solution={undefined}
        onSolutionChange={onSolutionChange}
      />
    );
    expect(screen.queryByTestId(SOLUTION_SELECTOR_SUBJ)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByText('Observability'));
    expect(onSolutionChange).toHaveBeenCalledWith('observability');
  });
});
