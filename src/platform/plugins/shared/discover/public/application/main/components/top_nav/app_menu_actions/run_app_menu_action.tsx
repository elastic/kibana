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
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverAppMenuRunAction } from './types';

const container = document.createElement('div');
let isOpen = false;

function cleanup(anchorElement?: HTMLElement) {
  if (!isOpen) {
    return;
  }
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
  anchorElement?.focus();
}

export async function runAppMenuAction({
  appMenuItem,
  anchorElement,
  services,
}: {
  appMenuItem:
    | AppMenuItemType
    | AppMenuPrimaryActionItem
    | AppMenuSecondaryActionItem
    | AppMenuPopoverItem;
  anchorElement: HTMLElement;
  services: DiscoverServices;
}) {
  cleanup(anchorElement);

  const onFinishAction = () => cleanup(anchorElement);
  const result = await (appMenuItem.run as DiscoverAppMenuRunAction | undefined)?.(
    anchorElement,
    onFinishAction
  );

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

export const enhanceAppMenuItemWithRunAction = <
  T extends AppMenuItemType | AppMenuPrimaryActionItem | AppMenuSecondaryActionItem
>({
  appMenuItem,
  services,
}: {
  appMenuItem: T;
  services: DiscoverServices;
}): T => {
  const itemWithItems = appMenuItem as AppMenuItemType;

  return {
    ...appMenuItem,
    // Recursively enhance nested items if present
    items: itemWithItems.items?.map((nestedItem: AppMenuPopoverItem) =>
      enhanceAppMenuItemWithRunAction({
        appMenuItem: nestedItem as AppMenuItemType,
        services,
      })
    ),
    run: appMenuItem.run
      ? (anchorElement: HTMLElement) => {
          runAppMenuAction({
            appMenuItem,
            anchorElement,
            services,
          });
        }
      : undefined,
  } as T;
};
