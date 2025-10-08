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
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import type { Vis } from '@kbn/visualizations-plugin/public';
import type { OptionsTabProps } from './options_tab';
import OptionsTab from './options_tab';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('OptionsTab', () => {
  let props: OptionsTabProps;
  let setValue: jest.MockedFunction<any>;

  beforeEach(() => {
    setValue = jest.fn();
    props = {
      vis: {} as Vis,
      stateParams: {
        updateFiltersOnChange: false,
        useTimeFilter: false,
        pinFilters: false,
      },
      setValue,
    } as unknown as OptionsTabProps;
  });

  it('should renders OptionsTab', () => {
    const { container } = render(
      <Wrapper>
        <OptionsTab {...props} />
      </Wrapper>
    );

    expect(container).toMatchSnapshot();
  });

  it('should update updateFiltersOnChange', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OptionsTab {...props} />
      </Wrapper>
    );

    const checkbox = screen.getByTestId('inputControlEditorUpdateFiltersOnChangeCheckbox');
    await user.click(checkbox);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith('updateFiltersOnChange', true);
  });

  it('should update useTimeFilter', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OptionsTab {...props} />
      </Wrapper>
    );

    const checkbox = screen.getByTestId('inputControlEditorUseTimeFilterCheckbox');
    await user.click(checkbox);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith('useTimeFilter', true);
  });

  it('should update pinFilters', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <OptionsTab {...props} />
      </Wrapper>
    );

    const checkbox = screen.getByTestId('inputControlEditorPinFiltersCheckbox');
    await user.click(checkbox);

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith('pinFilters', true);
  });
});
