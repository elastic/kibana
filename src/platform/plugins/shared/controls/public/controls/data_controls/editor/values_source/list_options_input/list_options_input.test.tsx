/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiSelectOption } from '@elastic/eui';

import { ListOptionsInput, INITIAL_OPTIONS } from './list_options_input';

const OPTIONS_FIELD_TEST_TIMEOUT = 15000;

const TestWrapper: React.FC<{
  component: (props: {
    value: EuiSelectOption[];
    onChange: (v: EuiSelectOption[]) => void;
  }) => ReactNode;
}> = ({ component }) => {
  const [value, setValue] = useState<EuiSelectOption[]>([]);
  const onChange = (v: EuiSelectOption[]) => setValue(v);
  return component({ onChange, value });
};

describe('Options field', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const onChange = jest.fn();

    render(
      <ListOptionsInput
        label="Values"
        data-test-subj="list-options-input"
        value={[]}
        onChange={onChange}
      />
    );

    expect(await screen.findByTestId('list-options-input')).toBeInTheDocument();
    expect(await screen.findByTestId('list-options-input-option-label-0')).toBeInTheDocument();
    expect(
      (await screen.findByTestId('list-options-input-option-label-0')).getAttribute('value')
    ).toBe(INITIAL_OPTIONS[0].text);
  });

  it(
    'adds and removes options correctly',
    async () => {
      render(
        <TestWrapper
          component={({ onChange, value }) => (
            <ListOptionsInput
              label="Values"
              data-test-subj="list-options-input"
              value={value}
              onChange={onChange}
            />
          )}
        />
      );

      expect(await screen.findByTestId('list-options-input')).toBeInTheDocument();
      await userEvent.click(await screen.findByTestId('list-options-input-option-label-0'));
      await userEvent.paste('Value 1');
      await userEvent.click(await screen.findByTestId('list-options-input-add-option'));
      await waitFor(async () =>
        expect(await screen.findByTestId('list-options-input-option-label-1')).toBeInTheDocument()
      );
      await userEvent.click(await screen.findByTestId('list-options-input-option-label-1'));
      await userEvent.paste('Value 2');
      await userEvent.click(await screen.findByTestId('list-options-input-remove-option-0'));
      // Value 2 should move to index 0 and index 1 should be removed
      expect(
        (await screen.findByTestId('list-options-input-option-label-0')).getAttribute('value')
      ).toBe('Value 2');
      await expect(screen.findByTestId('list-options-input-option-label-1')).rejects.toThrow();
    },
    OPTIONS_FIELD_TEST_TIMEOUT
  );

  it(
    'adds no more than maximum set options',
    async () => {
      render(
        <TestWrapper
          component={({ onChange, value }) => (
            <ListOptionsInput
              label="Values"
              data-test-subj="list-options-input"
              value={value}
              onChange={onChange}
              maxOptions={3}
            />
          )}
        />
      );

      expect(await screen.findByTestId('list-options-input')).toBeInTheDocument();
      expect(await screen.findByTestId('list-options-input-option-label-0')).toBeInTheDocument();
      await userEvent.click(await screen.findByTestId('list-options-input-add-option'));
      await userEvent.click(await screen.findByTestId('list-options-input-add-option'));
      await expect(screen.findByTestId('list-options-input-add-option')).rejects.toThrow();
      await userEvent.click(await screen.findByTestId('list-options-input-remove-option-0'));
      expect(await screen.findByTestId('list-options-input-add-option')).toBeInTheDocument();
    },
    OPTIONS_FIELD_TEST_TIMEOUT
  );
});
