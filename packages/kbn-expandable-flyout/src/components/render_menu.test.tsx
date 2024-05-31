/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { RenderMenu } from './render_menu';
import { EuiFlyoutProps } from '@elastic/eui';
import {
  RENDER_MENU_BUTTON_TEST_ID,
  RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
  RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID,
} from './test_ids';

describe('RenderMenu', () => {
  it('should render the flyout type button group', () => {
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange: jest.fn(),
      disabled: false,
    };

    const { getByTestId } = render(<RenderMenu flyoutTypeProps={flyoutTypeProps} />);

    getByTestId(RENDER_MENU_BUTTON_TEST_ID).click();

    expect(getByTestId(RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID)).toBeInTheDocument();
  });

  it('should select correct the flyout type', () => {
    const onChange = jest.fn();
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange,
      disabled: false,
    };

    const { getByTestId } = render(<RenderMenu flyoutTypeProps={flyoutTypeProps} />);

    getByTestId(RENDER_MENU_BUTTON_TEST_ID).click();
    getByTestId(RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID).click();

    expect(onChange).toHaveBeenCalledWith('push');
  });

  it('should render the the flyout type button group disabled', () => {
    const flyoutTypeProps = {
      type: 'overlay' as EuiFlyoutProps['type'],
      onChange: jest.fn(),
      disabled: true,
    };

    const { getByTestId } = render(<RenderMenu flyoutTypeProps={flyoutTypeProps} />);

    getByTestId(RENDER_MENU_BUTTON_TEST_ID).click();
    expect(getByTestId(RENDER_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID)).toHaveAttribute('disabled');
  });
});
