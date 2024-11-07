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
import {
  SETTINGS_MENU_BUTTON_TEST_ID,
  SETTINGS_MENU_FLYOUT_RESIZE_BUTTON_TEST_ID,
  SETTINGS_MENU_FLYOUT_RESIZE_INFORMATION_ICON_TEST_ID,
  SETTINGS_MENU_FLYOUT_RESIZE_TITLE_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID,
  SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID,
} from './test_ids';
import { TestProvider } from '../test/provider';
import { localStorageMock } from '../../__mocks__';
import {
  USER_COLLAPSED_WIDTH_LOCAL_STORAGE,
  EXPANDABLE_FLYOUT_LOCAL_STORAGE,
  USER_EXPANDED_WIDTH_LOCAL_STORAGE,
  USER_SECTION_WIDTHS_LOCAL_STORAGE,
  PUSH_VS_OVERLAY_LOCAL_STORAGE,
} from '../constants';
import { initialPanelsState, initialUiState } from '../store/state';

describe('SettingsMenu', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock(),
    });
  });

  describe('push vs overlay', () => {
    it('should render the flyout type button group', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        pushVsOverlay: {
          disabled: false,
          tooltip: '',
        },
      };

      const { getByTestId, queryByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();

      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_TITLE_TEST_ID)).toBeInTheDocument();
      expect(
        queryByTestId(SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID)
      ).not.toBeInTheDocument();
      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID)).toBeInTheDocument();
    });

    it('should have the type selected if option is enabled', () => {
      const state = {
        panels: initialPanelsState,
        ui: {
          ...initialUiState,
          pushVsOverlay: 'push' as const,
        },
      };
      const flyoutCustomProps = {
        hideSettings: false,
        pushVsOverlay: {
          disabled: false,
          tooltip: '',
        },
      };

      const { getByTestId } = render(
        <TestProvider state={state}>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();

      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID)).toHaveClass(
        'euiButtonGroupButton-isSelected'
      );
      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID)).not.toHaveClass(
        'euiButtonGroupButton-isSelected'
      );
    });

    it('should select correct the flyout type', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        pushVsOverlay: {
          disabled: false,
          tooltip: '',
        },
      };

      const { getByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
      getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID).click();

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(
        JSON.stringify({ [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'push' })
      );

      getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID).click();

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(
        JSON.stringify({ [PUSH_VS_OVERLAY_LOCAL_STORAGE]: 'overlay' })
      );
    });

    it('should render the the flyout type button group disabled', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        pushVsOverlay: {
          disabled: true,
          tooltip: 'This option is disabled',
        },
      };

      const { getByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_TEST_ID)).toHaveAttribute(
        'disabled'
      );

      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID)).toBeInTheDocument();

      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_OVERLAY_TEST_ID)).toHaveClass(
        'euiButtonGroupButton-isSelected'
      );
      expect(getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID)).not.toHaveClass(
        'euiButtonGroupButton-isSelected'
      );

      getByTestId(SETTINGS_MENU_FLYOUT_TYPE_BUTTON_GROUP_PUSH_TEST_ID).click();

      expect(localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE)).toEqual(null);
    });

    it('should not render the information icon if the tooltip is empty', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        pushVsOverlay: {
          disabled: true,
          tooltip: '',
        },
      };

      const { getByTestId, queryByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();

      expect(
        queryByTestId(SETTINGS_MENU_FLYOUT_TYPE_INFORMATION_ICON_TEST_ID)
      ).not.toBeInTheDocument();
    });
  });

  describe('resize', () => {
    it('should render the flyout resize button', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        resize: {
          disabled: false,
          tooltip: '',
        },
      };
      const { getByTestId, queryByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();

      expect(getByTestId(SETTINGS_MENU_FLYOUT_RESIZE_TITLE_TEST_ID)).toBeInTheDocument();
      expect(
        queryByTestId(SETTINGS_MENU_FLYOUT_RESIZE_INFORMATION_ICON_TEST_ID)
      ).not.toBeInTheDocument();
      expect(getByTestId(SETTINGS_MENU_FLYOUT_RESIZE_BUTTON_TEST_ID)).toBeInTheDocument();
    });

    it('should reset correctly when clicked', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        resize: {
          disabled: false,
          tooltip: '',
        },
      };

      localStorage.setItem(
        EXPANDABLE_FLYOUT_LOCAL_STORAGE,
        JSON.stringify({
          [USER_COLLAPSED_WIDTH_LOCAL_STORAGE]: '250',
          [USER_EXPANDED_WIDTH_LOCAL_STORAGE]: '500',
          [USER_SECTION_WIDTHS_LOCAL_STORAGE]: { left: 50, right: 50 },
        })
      );

      const { getByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
      getByTestId(SETTINGS_MENU_FLYOUT_RESIZE_BUTTON_TEST_ID).click();

      const expandableFlyout = localStorage.getItem(EXPANDABLE_FLYOUT_LOCAL_STORAGE);
      expect(expandableFlyout).not.toBe(null);

      expect(expandableFlyout).not.toHaveProperty(USER_COLLAPSED_WIDTH_LOCAL_STORAGE);
      expect(expandableFlyout).not.toHaveProperty(USER_EXPANDED_WIDTH_LOCAL_STORAGE);
      expect(expandableFlyout).not.toHaveProperty(USER_SECTION_WIDTHS_LOCAL_STORAGE);
    });

    it('should render the the flyout resize button disabled', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        resize: {
          disabled: true,
          tooltip: 'This option is disabled',
        },
      };

      const { getByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
      expect(getByTestId(SETTINGS_MENU_FLYOUT_RESIZE_BUTTON_TEST_ID)).toHaveAttribute('disabled');
      expect(getByTestId(SETTINGS_MENU_FLYOUT_RESIZE_INFORMATION_ICON_TEST_ID)).toBeInTheDocument();
    });

    it('should not render the information icon if the tooltip is empty', () => {
      const flyoutCustomProps = {
        hideSettings: false,
        resize: {
          disabled: true,
          tooltip: '',
        },
      };

      const { getByTestId, queryByTestId } = render(
        <TestProvider>
          <SettingsMenu flyoutCustomProps={flyoutCustomProps} />
        </TestProvider>
      );

      getByTestId(SETTINGS_MENU_BUTTON_TEST_ID).click();
      expect(
        queryByTestId(SETTINGS_MENU_FLYOUT_RESIZE_INFORMATION_ICON_TEST_ID)
      ).not.toBeInTheDocument();
    });
  });
});
