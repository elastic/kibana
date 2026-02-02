/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  AppMenuItemType,
  AppMenuPopoverItem,
  AppMenuPrimaryActionItem,
  AppMenuRunActionParams,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import type {
  DiscoverAppMenuItemType,
  DiscoverAppMenuPopoverItem,
  DiscoverAppMenuPrimaryActionItem,
  DiscoverAppMenuRunActionParams,
  DiscoverAppMenuSecondaryActionItem,
} from '@kbn/discover-utils';
import type { DiscoverServices } from '../../../../../build_services';

const container = document.createElement('div');
let isOpen = false;

function restoreFocus(anchorElement?: HTMLElement, parentTestId?: string) {
  const overflowButton = document.querySelector(
    '[data-test-subj="app-menu-overflow-button"]'
  ) as HTMLElement;

  if (parentTestId) {
    const parentButton = document.querySelector(
      `[data-test-subj="${parentTestId}"]`
    ) as HTMLElement;
    (parentButton || overflowButton)?.focus();
  } else if (anchorElement && document.body.contains(anchorElement)) {
    anchorElement.focus();
  } else {
    overflowButton?.focus();
  }
}

function cleanup(anchorElement?: HTMLElement, parentTestId?: string) {
  if (!isOpen) {
    return;
  }

  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;

  restoreFocus(anchorElement, parentTestId);
}

export async function runAppMenuAction({
  appMenuItem,
  anchorElement,
  services,
  parentTestId,
}: {
  appMenuItem:
    | DiscoverAppMenuItemType
    | DiscoverAppMenuPrimaryActionItem
    | DiscoverAppMenuSecondaryActionItem
    | DiscoverAppMenuPopoverItem;
  anchorElement: HTMLElement;
  services: DiscoverServices;
  parentTestId?: string;
}) {
  cleanup(anchorElement, parentTestId);

  const onFinishAction = () => {
    cleanup(anchorElement, parentTestId);
    // If cleanup didn't run (no React element), still restore focus
    if (!isOpen) {
      restoreFocus(anchorElement, parentTestId);
    }
  };

  const params: DiscoverAppMenuRunActionParams = {
    triggerElement: anchorElement,
    context: {
      onFinishAction,
      parentTestId,
    },
  };

  const result = await appMenuItem.run?.(params);

  if (!result || !React.isValidElement(result)) {
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <KibanaRenderContextProvider {...services.core}>
      <KibanaContextProvider services={services}>{result}</KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}

/**
 * Maps Discover-specific menu item types to their corresponding base AppMenu types.
 */
type EnhancedAppMenuItem<T> = T extends DiscoverAppMenuItemType
  ? AppMenuItemType
  : T extends DiscoverAppMenuPrimaryActionItem
  ? AppMenuPrimaryActionItem
  : T extends DiscoverAppMenuSecondaryActionItem
  ? AppMenuSecondaryActionItem
  : T extends DiscoverAppMenuPopoverItem
  ? AppMenuPopoverItem
  : never;

type DiscoverAppMenuItem =
  | DiscoverAppMenuItemType
  | DiscoverAppMenuPrimaryActionItem
  | DiscoverAppMenuSecondaryActionItem
  | DiscoverAppMenuPopoverItem;

/**
 * Transforms Discover-specific menu items into base AppMenu types by replacing
 * the run action with one that wraps the Discover-specific behavior.
 * This allows the items to be used with the core AppMenu component.
 */
export function enhanceAppMenuItemWithRunAction<T extends DiscoverAppMenuItem>({
  appMenuItem,
  services,
  parentTestId,
}: {
  appMenuItem: T;
  services: DiscoverServices;
  parentTestId?: string;
}): EnhancedAppMenuItem<T> {
  const enhancedRun = appMenuItem.run
    ? (params?: AppMenuRunActionParams) => {
        if (params) {
          runAppMenuAction({
            appMenuItem,
            anchorElement: params.triggerElement,
            services,
            parentTestId,
          });
        }
      }
    : undefined;

  const enhancedItems =
    'items' in appMenuItem && Array.isArray(appMenuItem.items)
      ? appMenuItem.items.map(
          (nestedItem): AppMenuPopoverItem =>
            enhanceAppMenuItemWithRunAction({
              appMenuItem: nestedItem,
              services,
              parentTestId: appMenuItem.testId || 'app-menu-overflow-button',
            })
        )
      : undefined;

  return {
    ...appMenuItem,
    items: enhancedItems,
    run: enhancedRun,
  } as unknown as EnhancedAppMenuItem<T>;
}
