/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactDOM from 'react-dom';

import { EuiContextMenu, EuiWrappingPopover } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DefaultControlApi } from '@kbn/controls-plugin/public';
import { ESQLVariableType, EsqlControlType, apiPublishesESQLVariables } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  apiHasType,
  useBatchedPublishingSubjects,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { getDashboardBackupService } from '../../../services/dashboard_backup_service';
import { executeAddLensPanelAction } from '../../../dashboard_actions/execute_add_lens_panel_action';
import type { DashboardApi } from '../../../dashboard_api/types';
import { addFromLibrary } from '../../../dashboard_renderer/add_panel_from_library';
import { uiActionsService } from '../../../services/kibana_services';
import {
  getAddControlButtonTitle,
  getControlButtonTitle,
  getAddESQLControlButtonTitle,
  getAddTimeSliderControlButtonTitle,
  getCreateVisualizationButtonTitle,
} from '../../_dashboard_app_strings';
import { AddPanelFlyout } from '../add_panel_button/components/add_panel_flyout';
import { topNavStrings } from '../../_dashboard_app_strings';
import { confirmDiscardUnsavedChanges } from '../../../dashboard_listing/confirm_overlays';

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
  coreServices,
  isResetting,
  resetChanges,
  setIsResetting,
  isSaveInProgress,
  setIsSaveInProgress,
  dashboardInteractiveSave,
}: SaveMenuProps) => {
  const [hasOverlays, hasUnsavedChanges, lastSavedId, viewMode] = useBatchedPublishingSubjects(
    dashboardApi.hasOverlays$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId$,
    dashboardApi.viewMode$
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
          icon: 'empty',
          'data-test-subj': 'dashboardInteractiveSaveMenuItem',
          iconType: lastSavedId ? undefined : 'save',
          onClick: () => {
            closePopover();
          },
        },
        {
          name: topNavStrings.resetChanges.label,
          icon: 'empty',
          'data-test-subj': 'dashboardDiscardChangesMenuItem',
          isLoading: isResetting,
          disable:
            isResetting ||
            !hasUnsavedChanges ||
            hasOverlays ||
            (viewMode === 'edit' && (isSaveInProgress || !lastSavedId)),
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
