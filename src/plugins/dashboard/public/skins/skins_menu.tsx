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
  onClear: () => void;
  onSelected: (name: string) => void;
  button: HTMLElement;
  currentlySelected: string;
}

export const SkinsMenu = (props: SkinsMenuProps) => {
  const { onSelected, button, onClear, currentlySelected } = props;

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Matrix',
          icon: currentlySelected === 'matrix' ? 'check' : 'layers',
          onClick: () => {
            onSelected('matrix');
            props.onClose();
          },
        },
        {
          name: 'Purple Haze',
          icon: currentlySelected === 'purple-haze' ? 'check' : 'layers',
          onClick: () => {
            onSelected('purple-haze');
            props.onClose();
          },
        },
        {
          name: 'Yellow Fever',
          icon: currentlySelected === 'yellow-fever' ? 'check' : 'layers',
          onClick: () => {
            onSelected('yellow-fever');
            props.onClose();
          },
        },
        {
          name: 'Spiderman',
          icon: currentlySelected === 'spiderman' ? 'check' : 'layers',
          onClick: () => {
            onSelected('spiderman');
            props.onClose();
          },
        },
        {
          isSeparator: true,
          key: 'sep',
        },
        {
          name: 'Clear',
          icon: 'trash',
          onClick: () => {
            onClear();
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
        panels={panels} // @ts-ignore
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
  currentlySelected: string,
  onSelected: (name: string) => void,
  onClear: () => void
) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);

  const element = (
    <SkinsMenu
      onClose={onClose}
      button={anchorElement}
      onSelected={onSelected}
      onClear={onClear}
      currentlySelected={currentlySelected}
    />
  );
  ReactDOM.render(element, container);
}
