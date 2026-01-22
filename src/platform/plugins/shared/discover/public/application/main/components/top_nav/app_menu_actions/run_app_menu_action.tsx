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
import type { AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
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

export const enhanceAppMenuItemWithRunAction = ({
  appMenuItem,
  services,
  parentTestId,
}: {
  appMenuItem:
    | DiscoverAppMenuItemType
    | DiscoverAppMenuPrimaryActionItem
    | DiscoverAppMenuSecondaryActionItem;
  services: DiscoverServices;
  parentTestId?: string;
}):
  | DiscoverAppMenuItemType
  | DiscoverAppMenuPrimaryActionItem
  | DiscoverAppMenuSecondaryActionItem => {
  const itemWithItems = appMenuItem as DiscoverAppMenuPopoverItem;

  return {
    ...appMenuItem,
    items: itemWithItems.items?.map(
      (nestedItem) =>
        enhanceAppMenuItemWithRunAction({
          appMenuItem: nestedItem as
            | DiscoverAppMenuItemType
            | DiscoverAppMenuPrimaryActionItem
            | DiscoverAppMenuSecondaryActionItem,
          services,
          parentTestId: appMenuItem.testId || 'app-menu-overflow-button',
        }) as DiscoverAppMenuPopoverItem
    ),
    run: appMenuItem.run
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
      : undefined,
  };
};
