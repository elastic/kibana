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

import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { EuiWrappingPopover, EuiContextMenu } from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type {
  AppMenuActionSecondary,
  AppMenuActionPrimary,
  AppMenuActionCustom,
  AppMenuActionSubmenuSecondary,
  AppMenuActionSubmenuCustom,
} from '@kbn/discover-utils';
import type { DiscoverServices } from '../../../../../build_services';

const container = document.createElement('div');
let isOpen = false;

interface AppMenuActionsMenuPopoverProps {
  appMenuItem: AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom;
  anchorElement: HTMLElement;
  services: DiscoverServices;
  onClose: () => void;
}

export const AppMenuActionsMenuPopover: React.FC<AppMenuActionsMenuPopoverProps> = ({
  appMenuItem,
  anchorElement,
  onClose: originalOnClose,
}) => {
  const [nestedContent, setNestedContent] = useState<React.ReactNode>();

  const onClose = useCallback(() => {
    originalOnClose();
    anchorElement?.focus();
  }, [anchorElement, originalOnClose]);

  const panels = [
    {
      id: appMenuItem.id,
      name: appMenuItem.label,
      items: appMenuItem.actions.map((action) => {
        const controlProps = action.controlProps;

        return {
          name: controlProps.label,
          disabled:
            typeof controlProps.disableButton === 'function'
              ? controlProps.disableButton()
              : Boolean(controlProps.disableButton),
          onClick: async () => {
            const result = await controlProps.onClick?.({
              anchorElement,
              onFinishAction: onClose,
            });

            if (result) {
              setNestedContent(result);
            }
          },
          href: controlProps.href,
          ['data-test-subj']: controlProps.testId,
          toolTipContent:
            typeof controlProps.tooltip === 'function'
              ? controlProps.tooltip()
              : controlProps.tooltip,
        };
      }),
    },
  ];

  return (
    <>
      {nestedContent}
      <EuiWrappingPopover
        ownFocus
        button={anchorElement}
        closePopover={onClose}
        isOpen={!nestedContent}
        panelPaddingSize="s"
      >
        <EuiContextMenu initialPanelId={appMenuItem.id} size="s" panels={panels} />
      </EuiWrappingPopover>
    </>
  );
};

function cleanup() {
  if (!isOpen) {
    return;
  }
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function runAppMenuPopoverAction({
  appMenuItem,
  anchorElement,
  services,
}: {
  appMenuItem: AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom;
  anchorElement: HTMLElement;
  services: DiscoverServices;
}) {
  if (isOpen) {
    cleanup();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <KibanaRenderContextProvider {...services.core}>
      <KibanaContextProvider services={services}>
        <AppMenuActionsMenuPopover
          appMenuItem={appMenuItem}
          anchorElement={anchorElement}
          services={services}
          onClose={cleanup}
        />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}

export async function runAppMenuAction({
  appMenuItem,
  anchorElement,
  services,
}: {
  appMenuItem: AppMenuActionPrimary | AppMenuActionSecondary | AppMenuActionCustom;
  anchorElement: HTMLElement;
  services: DiscoverServices;
}) {
  cleanup();

  const controlProps = appMenuItem.controlProps;

  const result = await controlProps.onClick?.({
    anchorElement,
    onFinishAction: () => {
      cleanup();
      anchorElement?.focus();
    },
  });

  if (!result) {
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
