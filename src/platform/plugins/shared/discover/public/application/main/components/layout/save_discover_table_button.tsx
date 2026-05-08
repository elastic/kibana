/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import {
  selectTabSavedSearchByValueAttributes,
  useCurrentTabSelector,
  useInternalStateGetState,
  useRuntimeStateManager,
} from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { TransferAction } from '../../../../plugin_imports/embeddable_editor_service';

const OBJECT_TYPE = i18n.translate('discover.saveDiscoverTable.modalTitle', {
  defaultMessage: 'Discover table',
});

const BUTTON_LABEL = i18n.translate('discover.saveDiscoverTable.buttonLabel', {
  defaultMessage: 'Save table to dashboard',
});

export function SaveDiscoverTableButton() {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const controlGroupState = useCurrentTabSelector((tab) => tab.attributes.controlGroupState);
  const getState = useInternalStateGetState();
  const services = useDiscoverServices();
  const runtimeStateManager = useRuntimeStateManager();

  const onSave = useCallback(
    async ({
      dashboardId,
      newTitle,
      newDescription,
    }: OnSaveProps & { dashboardId: string | null }) => {
      const byValueState = await selectTabSavedSearchByValueAttributes({
        tabId: currentTabId,
        getState,
        runtimeStateManager,
        services,
      });

      services.embeddableEditor.transferBackToEditor(TransferAction.SaveByValue, {
        state: {
          byValueState: { ...byValueState, title: newTitle, description: newDescription },
          controlGroupState,
        },
        app: 'dashboards',
        path: dashboardId && dashboardId !== 'new' ? `#/view/${dashboardId}` : '#/create',
      });
    },
    [currentTabId, getState, runtimeStateManager, services, controlGroupState]
  );

  return (
    <>
      <EuiToolTip content={BUTTON_LABEL} delay="long" disableScreenReaderOutput position="top">
        <EuiButtonIcon
          data-test-subj="saveDiscoverTableToDashboardButton"
          aria-label={BUTTON_LABEL}
          color="text"
          size="s"
          iconSize="m"
          iconType="dashboardApp"
          onClick={() => setShowSaveModal(true)}
        />
      </EuiToolTip>
      {showSaveModal && (
        <SavedObjectSaveModalDashboard
          documentInfo={{
            title: '',
            description: '',
          }}
          canSaveByReference={false}
          objectType={OBJECT_TYPE}
          onClose={() => setShowSaveModal(false)}
          onSave={onSave}
        />
      )}
    </>
  );
}
