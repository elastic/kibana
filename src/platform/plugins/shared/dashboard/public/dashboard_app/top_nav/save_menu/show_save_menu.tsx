/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';

import { EuiContextMenu, EuiWrappingPopover } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import type { DashboardApi } from '../../../dashboard_api/types';
import { topNavStrings } from '../../_dashboard_app_strings';

interface SaveMenuProps {
  anchorElement: HTMLElement;
  coreServices: CoreStart;
  dashboardApi: DashboardApi;
  isResetting: boolean;
  resetChanges: () => void;
  setIsResetting: (isResetting: boolean) => void;
  isSaveInProgress: boolean;
  setIsSaveInProgress: (isSaveInProgress: boolean) => void;
  dashboardInteractiveSave: () => void;
}

const container = document.createElement('div');
let isOpen = false;

function cleanup() {
  if (!isOpen) {
    return;
  }
  ReactDOM.unmountComponentAtNode(container);
  document.body.removeChild(container);
  isOpen = false;
}

export const SaveMenu = ({
  dashboardApi,
  anchorElement,
  isResetting,
  isSaveInProgress,
  resetChanges,
  dashboardInteractiveSave,
}: SaveMenuProps) => {
  const [hasOverlays, hasUnsavedChanges, lastSavedId] = useBatchedPublishingSubjects(
    dashboardApi.hasOverlays$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId$
  );

  const closePopover = useCallback(() => {
    cleanup();
    anchorElement.focus();
  }, [anchorElement]);

  const panels = [
    {
      id: 0,
      initialFocusedItemIndex: 0,
      items: [
        {
          name: topNavStrings.editModeInteractiveSave.label,
          icon: 'save',
          'data-test-subj': 'dashboardInteractiveSaveMenuItem',
          iconType: lastSavedId ? undefined : 'save',
          onClick: () => {
            dashboardInteractiveSave();
            closePopover();
          },
        },
        {
          name: topNavStrings.resetChanges.label,
          icon: 'editorUndo',
          'data-test-subj': 'dashboardDiscardChangesMenuItem',
          isLoading: isResetting,
          disabled:
            isResetting || !hasUnsavedChanges || hasOverlays || isSaveInProgress || !lastSavedId,
          onClick: () => {
            resetChanges();
            closePopover();
          },
        },
      ],
    },
  ];

  return (
    <EuiWrappingPopover
      isOpen={isOpen}
      closePopover={closePopover}
      button={anchorElement}
      panelPaddingSize="none"
      anchorPosition="downRight"
      attachToAnchor
      panelStyle={{ maxWidth: 100 }}
      buffer={0}
      repositionOnScroll
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiWrappingPopover>
  );
};

export function showSaveMenu({ coreServices, ...props }: SaveMenuProps) {
  if (isOpen) {
    cleanup();
    return;
  }

  isOpen = true;
  document.body.appendChild(container);
  ReactDOM.render(
    <KibanaContextProvider services={coreServices}>
      <SaveMenu {...props} coreServices={coreServices} />
    </KibanaContextProvider>,
    container
  );
}
