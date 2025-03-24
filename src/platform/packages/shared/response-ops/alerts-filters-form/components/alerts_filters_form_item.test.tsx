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
import { userEvent } from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { alertsFilters } from '../filters';
import { AlertsFiltersFormItem } from './alerts_filters_form_item';

jest.mock('../filters', () => {
  const original: { alertsFilters: typeof alertsFilters } = jest.requireActual('../filters');
  return {
    alertsFilters: Object.fromEntries(
      Object.entries(original.alertsFilters).map(([key, value]) => [
        key,
        {
          ...value,
          component: jest
            .fn()
            .mockImplementation((props) => (
              <div data-test-subj={`${key}Filter`}>{props.value}</div>
            )),
        },
      ])
    ),
  };
});

describe('AlertsFiltersFormItem', () => {
  it('should show all available filter types as options', async () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersFormItem onTypeChange={jest.fn()} onValueChange={jest.fn()} />
      </IntlProvider>
    );

    await userEvent.click(screen.getByRole('button'));
    Object.values(alertsFilters).forEach((filterMeta) => {
      expect(screen.getByText(filterMeta.displayName)).toBeInTheDocument();
    });
  });

  it('should render the correct filter component for the selected type', () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersFormItem
          type={alertsFilters.ruleTags.id}
          onTypeChange={jest.fn()}
          onValueChange={jest.fn()}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('ruleTagsFilter')).toBeInTheDocument();
  });

  it('should forward the value to the selected filter component', () => {
    render(
      <IntlProvider locale="en">
        <AlertsFiltersFormItem
          type={alertsFilters.ruleTags.id}
          onTypeChange={jest.fn()}
          value={['tag1']}
          onValueChange={jest.fn()}
        />
      </IntlProvider>
    );

    expect(screen.getByText('tag1')).toBeInTheDocument();
  });
});
