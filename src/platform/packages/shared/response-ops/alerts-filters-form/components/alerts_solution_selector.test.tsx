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
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useGetInternalRuleTypesQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { AlertsSolutionSelector } from './alerts_solution_selector';
import { SOLUTION_SELECTOR_SUBJ } from '../constants';
import userEvent from '@testing-library/user-event';

const http = httpServiceMock.createStartContract();
jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query');
const mockUseGetInternalRuleTypesQuery = useGetInternalRuleTypesQuery as jest.Mock;

describe('AlertsSolutionSelector', () => {
  it('should not render when only no solution is available', () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    const mockOnSolutionChange = jest.fn();
    render(
      <AlertsSolutionSelector
        solution={undefined}
        onSolutionChange={mockOnSolutionChange}
        services={{ http }}
      />
    );
    expect(screen.queryByTestId(SOLUTION_SELECTOR_SUBJ)).not.toBeInTheDocument();
    expect(mockOnSolutionChange).not.toHaveBeenCalled();
  });

  it.each(['stack', 'security', 'observability'])(
    'should not render when only one solution (%s) is available and auto-select it',
    (solution) => {
      mockUseGetInternalRuleTypesQuery.mockReturnValue({
        data: [{ id: '.test-rule-type', name: 'Test rule type', solution }],
        isLoading: false,
        isError: false,
      });
      const mockOnSolutionChange = jest.fn();
      render(
        <AlertsSolutionSelector
          solution={undefined}
          onSolutionChange={mockOnSolutionChange}
          services={{ http }}
        />
      );
      expect(screen.queryByTestId(SOLUTION_SELECTOR_SUBJ)).not.toBeInTheDocument();
      expect(mockOnSolutionChange).toHaveBeenCalledWith(solution);
    }
  );

  it('should not render when only stack and observability are available and auto-select observability', () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      data: [
        { id: '.es-query', name: 'Elasticsearch Query', solution: 'stack' },
        { id: '.custom-threshold', name: 'Custom threshold', solution: 'observability' },
      ] as InternalRuleType[],
      isLoading: false,
      isError: false,
    });
    const mockOnSolutionChange = jest.fn();
    render(
      <AlertsSolutionSelector
        solution={undefined}
        onSolutionChange={mockOnSolutionChange}
        services={{ http }}
      />
    );
    expect(screen.queryByTestId(SOLUTION_SELECTOR_SUBJ)).not.toBeInTheDocument();
    expect(mockOnSolutionChange).toHaveBeenCalledWith('observability');
  });

  it('should render when security and observability/stack are available', async () => {
    mockUseGetInternalRuleTypesQuery.mockReturnValue({
      data: [
        { id: '.es-query', name: 'Elasticsearch Query', solution: 'stack' },
        { id: '.custom-threshold', name: 'Custom threshold', solution: 'observability' },
        { id: 'siem.esqlRule', name: 'Security ESQL Rule', solution: 'security' },
      ] as InternalRuleType[],
      isLoading: false,
      isError: false,
    });
    render(
      <AlertsSolutionSelector
        solution={undefined}
        onSolutionChange={jest.fn()}
        services={{ http }}
      />
    );
    expect(screen.queryByTestId(SOLUTION_SELECTOR_SUBJ)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('Observability')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });
});
