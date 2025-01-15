/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppMenuActionType, AppMenuItem } from '@kbn/discover-utils';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { runAppMenuAction, runAppMenuPopoverAction } from './run_app_menu_action';
import { DiscoverServices } from '../../../../../build_services';

export function convertAppMenuItemToTopNavItem({
  appMenuItem,
  services,
}: {
  appMenuItem: AppMenuItem;
  services: DiscoverServices;
}): TopNavMenuData {
  if ('actions' in appMenuItem) {
    return {
      id: appMenuItem.id,
      label: appMenuItem.label,
      description: appMenuItem.description ?? appMenuItem.label,
      testId: appMenuItem.testId,
      run: (anchorElement: HTMLElement) => {
        runAppMenuPopoverAction({
          appMenuItem,
          anchorElement,
          services,
        });
      },
    };
  }

  return {
    id: appMenuItem.id,
    label: appMenuItem.controlProps.label,
    description: appMenuItem.controlProps.description ?? appMenuItem.controlProps.label,
    testId: appMenuItem.controlProps.testId,
    run: async (anchorElement: HTMLElement) => {
      await runAppMenuAction({
        appMenuItem,
        anchorElement,
        services,
      });
    },
    ...(appMenuItem.type === AppMenuActionType.primary
      ? { iconType: appMenuItem.controlProps.iconType, iconOnly: true }
      : {}),
  };
}
