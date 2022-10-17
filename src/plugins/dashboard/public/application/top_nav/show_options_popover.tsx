/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@kbn/i18n-react';
import { EuiWrappingPopover } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { OptionsMenu } from './options';
import { pluginServices } from '../../services/plugin_services';

let isOpen = false;

const container = document.createElement('div');

const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export interface ShowOptionsPopoverProps {
  anchorElement: HTMLElement;
  useMargins: boolean;
  onUseMarginsChange: (useMargins: boolean) => void;
  syncColors: boolean;
  onSyncColorsChange: (syncColors: boolean) => void;
  syncCursor: boolean;
  onSyncCursorChange: (syncCursor: boolean) => void;
  syncTooltips: boolean;
  onSyncTooltipsChange: (syncTooltips: boolean) => void;
  hidePanelTitles: boolean;
  onHidePanelTitlesChange: (hideTitles: boolean) => void;
}

export function showOptionsPopover({
  anchorElement,
  useMargins,
  onUseMarginsChange,
  hidePanelTitles,
  onHidePanelTitlesChange,
  syncColors,
  onSyncColorsChange,
  syncCursor,
  onSyncCursorChange,
  syncTooltips,
  onSyncTooltipsChange,
}: ShowOptionsPopoverProps) {
  const {
    settings: {
      theme: { theme$ },
    },
  } = pluginServices.getServices();

  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <EuiWrappingPopover
          id="popover"
          button={anchorElement}
          isOpen={true}
          closePopover={onClose}
        >
          <OptionsMenu
            useMargins={useMargins}
            onUseMarginsChange={onUseMarginsChange}
            hidePanelTitles={hidePanelTitles}
            onHidePanelTitlesChange={onHidePanelTitlesChange}
            syncColors={syncColors}
            onSyncColorsChange={onSyncColorsChange}
            syncCursor={syncCursor}
            onSyncCursorChange={onSyncCursorChange}
            syncTooltips={syncTooltips}
            onSyncTooltipsChange={onSyncTooltipsChange}
          />
        </EuiWrappingPopover>
      </KibanaThemeProvider>
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}
