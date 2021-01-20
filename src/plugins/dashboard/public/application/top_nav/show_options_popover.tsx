/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiWrappingPopover } from '@elastic/eui';

import { OptionsMenu } from './options';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export function showOptionsPopover({
  anchorElement,
  useMargins,
  onUseMarginsChange,
  hidePanelTitles,
  onHidePanelTitlesChange,
  syncColors,
  onSyncColorsChange,
}: {
  anchorElement: HTMLElement;
  useMargins: boolean;
  onUseMarginsChange: (useMargins: boolean) => void;
  syncColors: boolean;
  onSyncColorsChange: (syncColors: boolean) => void;
  hidePanelTitles: boolean;
  onHidePanelTitlesChange: (hideTitles: boolean) => void;
}) {
  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <EuiWrappingPopover id="popover" button={anchorElement} isOpen={true} closePopover={onClose}>
        <OptionsMenu
          useMargins={useMargins}
          onUseMarginsChange={onUseMarginsChange}
          hidePanelTitles={hidePanelTitles}
          onHidePanelTitlesChange={onHidePanelTitlesChange}
          syncColors={syncColors}
          onSyncColorsChange={onSyncColorsChange}
        />
      </EuiWrappingPopover>
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}
