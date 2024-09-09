/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';

import { SettingsMenu } from './settings_menu';
import { EuiFlyoutProps } from '@elastic/eui';
import {
  SETTINGS_MENU_BUTTON_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID,
} from './test_ids';

describe('SettingsMenu', () => {
  it('should render the flyout type button group', () => {
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange: jest.fn(),
      disabled: false,
      tooltip: '',
    };

    const { getByTestId, queryByTestId } = render(
      <SettingsMenu flyoutTypeProps={flyoutTypeProps} />
    );

    getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();

    expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID)).toBeInTheDocument();
    expect(
      queryByTestId(SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID)
    ).not.toBeInTheDocument();
    expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID)).toBeInTheDocument();
  });

  it('should select correct the flyout type', () => {
    const onChange = jest.fn();
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange,
      disabled: false,
      tooltip: '',
    };

    const { getByTestId } = render(<SettingsMenu flyoutTypeProps={flyoutTypeProps} />);

    getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
    getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID).click();

    expect(onChange).toHaveBeenCalledWith('push');
  });

  it('should render the the flyout type button group disabled', () => {
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange: jest.fn(),
      disabled: true,
      tooltip: 'This option is disabled',
    };

    const { getByTestId } = render(<SettingsMenu flyoutTypeProps={flyoutTypeProps} />);

    getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
    expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID)).toHaveAttribute('disabled');
    expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID)).toBeInTheDocument();
  });

  it('should not render the information icon if the tooltip is empty', () => {
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange: jest.fn(),
      disabled: true,
      tooltip: '',
    };

    const { getByTestId, queryByTestId } = render(
      <SettingsMenu flyoutTypeProps={flyoutTypeProps} />
    );

    getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
    expect(
      queryByTestId(SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID)
    ).not.toBeInTheDocument();
  });
});
