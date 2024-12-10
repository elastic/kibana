/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { AppMenuActionSubmenuCustom, AppMenuActionType, AppMenuItem } from '@kbn/discover-utils';
import { discoverServiceMock } from '../../../../../__mocks__/services';
import { runAppMenuAction, runAppMenuPopoverAction } from './run_app_menu_action';

describe('run app menu actions', () => {
  describe('runAppMenuAction', () => {
    it('should call the action correctly', () => {
      const appMenuItem: AppMenuItem = {
        id: 'action-1',
        type: AppMenuActionType.primary,
        controlProps: {
          label: 'Action 1',
          testId: 'action-1',
          iconType: 'share',
          onClick: jest.fn(),
        },
      };

      const anchorElement = document.createElement('div');

      runAppMenuAction({
        appMenuItem,
        anchorElement,
        services: discoverServiceMock,
      });

      expect(appMenuItem.controlProps.onClick).toHaveBeenCalled();
    });

    it('should call the action and render a custom content', async () => {
      const appMenuItem: AppMenuItem = {
        id: 'action-1',
        type: AppMenuActionType.primary,
        controlProps: {
          label: 'Action 1',
          testId: 'action-1',
          iconType: 'share',
          onClick: jest.fn(({ onFinishAction }) => (
            <button data-test-subj="test-content" onClick={onFinishAction} />
          )),
        },
      };

      const anchorElement = document.createElement('div');

      await runAppMenuAction({
        appMenuItem,
        anchorElement,
        services: discoverServiceMock,
      });

      expect(appMenuItem.controlProps.onClick).toHaveBeenCalled();
      const customButton = screen.getByTestId('test-content');
      expect(customButton).toBeInTheDocument();
      customButton.click();
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('runAppMenuPopoverAction', () => {
    it('should render the submenu action correctly', async () => {
      const mockClick = jest.fn();
      const appMenuItem: AppMenuActionSubmenuCustom = {
        id: 'action-submenu',
        type: AppMenuActionType.custom,
        label: 'Action Submenu',
        testId: 'test-action-submenu',
        actions: [
          {
            id: 'action-submenu-1',
            type: AppMenuActionType.custom,
            controlProps: {
              label: 'Action 3.1',
              testId: 'action-submenu-1',
              onClick: mockClick,
            },
          },
          {
            id: 'action-submenu-2',
            testId: 'action-submenu-2',
            type: AppMenuActionType.submenuHorizontalRule,
          },
          {
            id: 'action-submenu-3',
            type: AppMenuActionType.custom,
            controlProps: {
              label: 'Action 3.3',
              testId: 'action-submenu-3',
              onClick: jest.fn(),
            },
          },
        ],
      };

      const anchorElement = document.createElement('div');

      runAppMenuPopoverAction({
        appMenuItem,
        anchorElement,
        services: discoverServiceMock,
      });

      screen.getByTestId('action-submenu-1').click();
      expect(mockClick).toHaveBeenCalled();
      expect(screen.getByTestId('action-submenu-2')).toBeInTheDocument();
      expect(screen.getByTestId('action-submenu-3')).toBeInTheDocument();
    });
  });
});
