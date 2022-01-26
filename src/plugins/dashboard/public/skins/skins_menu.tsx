/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenu, EuiWrappingPopover } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';

const container = document.createElement('div');
let isOpen = false;

export interface SkinsMenuProps {
  onClose: () => void;
  onSelected: (name: string) => void;
  button: HTMLElement;
}

export const SkinsMenu = (props: SkinsMenuProps) => {
  const { onSelected, button } = props;

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Matrix',
          icon: 'apps',
          onClick: () => {
            onSelected('matrix');
            props.onClose();
          },
        },
        {
          name: 'Purple Haze',
          icon: 'apps',
          onClick: () => {
            onSelected('purple-haze');
            props.onClose();
          },
        },
      ],
    },
  ];
  return (
    <EuiWrappingPopover ownFocus button={button} closePopover={props.onClose} isOpen>
      <EuiContextMenu
        initialPanelId={0}
        panels={panels}
        data-test-subj="dashboardSkinsContextMenu"
      />
    </EuiWrappingPopover>
  );
};

function onClose() {
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export function openSkinsMenuPopover(
  anchorElement: HTMLElement,
  onSelected: (name: string) => void
) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = <SkinsMenu onClose={onClose} button={anchorElement} onSelected={onSelected} />;
  ReactDOM.render(element, container);
}
