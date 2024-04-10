/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { docLinksServiceMock } from '@kbn/core/public/mocks';

import { RuleFormPage } from './rule_form_page';
import { renderWithProviders, waitForFormToLoad, mockRuleType } from '../common/test_utils';

const docLinksMock = docLinksServiceMock.createStartContract();
const expressionPluginsMock = {
  charts: jest.fn(),
  data: jest.fn(),
  dataViews: jest.fn(),
  unifiedSearch: jest.fn(),
};

describe('Create rule form full page', () => {
  it('renders a new rule correctly', async () => {
    renderWithProviders(
      <RuleFormPage
        onClickReturn={jest.fn()}
        onSaveRule={jest.fn()}
        docLinks={docLinksMock}
        expressionPlugins={expressionPluginsMock}
      />
    );
    await waitForFormToLoad();

    const expectedTitle = `${mockRuleType.name} rule`;

    expect(screen.getByTestId('ruleFormTitle')).toHaveTextContent(expectedTitle);
    expect(screen.getByTestId('ruleNameField')).toHaveValue(expectedTitle);
    expect(screen.queryByTestId('euiErrorBoundary')).not.toBeInTheDocument();
    expect(screen.getByTestId('intervalInput')).toHaveValue(1);
    expect(screen.getByTestId('intervalInputUnit')).toHaveValue('m');
    expect(screen.getByTestId('ruleDefinitionHeaderRuleTypeName')).toHaveTextContent(
      mockRuleType.name
    );
    expect(screen.getByTestId('ruleDefinitionHeaderRuleTypeDescription')).toHaveTextContent(
      mockRuleType.description
    );
    expect(screen.getByTestId('ruleDefinitionHeaderDocsLink')).toBeInTheDocument();

    expect(screen.getByTestId('saveRuleButton')).not.toHaveAttribute('disabled');
  });

  it('synchronizes the header with the rule field name in Rule Details', async () => {
    renderWithProviders(
      <RuleFormPage
        onClickReturn={jest.fn()}
        onSaveRule={jest.fn()}
        docLinks={docLinksMock}
        expressionPlugins={expressionPluginsMock}
      />
    );
    await waitForFormToLoad();

    await fireEvent.change(screen.getByTestId('ruleNameField'), { target: { value: 'New title' } });
    expect(screen.getByTestId('ruleNameField')).toHaveValue('New title');
    expect(screen.getByTestId('ruleFormTitle')).toHaveTextContent('New title');
  });

  it('disables the save button when the rule name is missing', async () => {
    renderWithProviders(
      <RuleFormPage
        onClickReturn={jest.fn()}
        onSaveRule={jest.fn()}
        docLinks={docLinksMock}
        expressionPlugins={expressionPluginsMock}
      />
    );
    await waitForFormToLoad();

    await fireEvent.change(screen.getByTestId('ruleNameField'), { target: { value: '' } });
    expect(screen.getByTestId('saveRuleButton')).toHaveAttribute('disabled');
    expect(screen.getByTestId('ruleDetailsStep')).toHaveTextContent('Step 3 is incomplete');
  });

  it('marks the rule definition as incomplete and disables the save button when a required value is missing from the expression', async () => {
    renderWithProviders(
      <RuleFormPage
        onClickReturn={jest.fn()}
        onSaveRule={jest.fn()}
        docLinks={docLinksMock}
        expressionPlugins={expressionPluginsMock}
      />
    );
    await waitForFormToLoad();

    await fireEvent.click(screen.getByTestId('clearOwo'));

    expect(screen.getByTestId('ruleDefinitionStep')).toHaveTextContent('Step 1 is incomplete');
    expect(screen.getByTestId('saveRuleButton')).toHaveAttribute('disabled');
    expect(screen.queryByTestId('ruleParamsErrorCallout')).not.toBeInTheDocument();

    await fireEvent.mouseOver(screen.getByTestId('saveRuleErrorIcon'));
    await waitFor(() => {
      expect(screen.queryByTestId('saveRuleErrorTooltip')).toBeInTheDocument();
      expect(screen.getByTestId('saveRuleErrorTooltip')).toHaveTextContent('owo is required');
    });
  });

  it('marks the rule definition as invalid and disables the save button when an expression param is invalid', async () => {
    renderWithProviders(
      <RuleFormPage
        onClickReturn={jest.fn()}
        onSaveRule={jest.fn()}
        docLinks={docLinksMock}
        expressionPlugins={expressionPluginsMock}
      />
    );
    await waitForFormToLoad();

    await fireEvent.click(screen.getByTestId('zeroUwu'));

    expect(screen.getByTestId('ruleDefinitionStep')).toHaveTextContent('Step 1 has errors');
    expect(screen.getByTestId('saveRuleButton')).toHaveAttribute('disabled');
    expect(screen.getByTestId('ruleParamsErrorCallout')).toHaveTextContent(
      'uwu must be greater than 0'
    );
  });

  it('waits for the user to interact with an expression using legacy validation logic before marking the rule definition as invalid', async () => {
    renderWithProviders(
      <RuleFormPage
        onClickReturn={jest.fn()}
        onSaveRule={jest.fn()}
        docLinks={docLinksMock}
        expressionPlugins={expressionPluginsMock}
      />,
      {
        registeredRuleTypeModel: {
          ...mockRuleType,
          defaultRuleParams: undefined,
          validate: () => {
            return {
              errors: {
                owo: ['Error'],
                uwu: ['Error'],
              },
            };
          },
        },
      }
    );
    await waitForFormToLoad();

    expect(screen.getByTestId('ruleDefinitionStep')).toHaveTextContent('Step 1 is incomplete');

    await fireEvent.focus(screen.getByTestId('zeroUwu'));
    await fireEvent.click(screen.getByTestId('zeroUwu'));

    expect(screen.getByTestId('ruleDefinitionStep')).toHaveTextContent('Step 1 has errors');
  });
});
