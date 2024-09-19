/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';

import { DASHBOARD_PANELS_UNSAVED_ID } from '../services/dashboard_backup/dashboard_backup_service';
import { coreServices } from '../services/kibana_services';
import { pluginServices } from '../services/plugin_services';
import {
  dashboardUnsavedListingStrings,
  getNewDashboardTitle,
  noItemsStrings,
} from './_dashboard_listing_strings';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';
import { DashboardListingProps } from './types';

export interface DashboardListingEmptyPromptProps {
  createItem: () => void;
  disableCreateDashboardButton?: boolean;
  unsavedDashboardIds: string[];
  goToDashboard: DashboardListingProps['goToDashboard'];
  setUnsavedDashboardIds: React.Dispatch<React.SetStateAction<string[]>>;
  useSessionStorageIntegration: DashboardListingProps['useSessionStorageIntegration'];
}

export const DashboardListingEmptyPrompt = ({
  useSessionStorageIntegration,
  setUnsavedDashboardIds,
  unsavedDashboardIds,
  goToDashboard,
  createItem,
  disableCreateDashboardButton,
}: DashboardListingEmptyPromptProps) => {
  const {
    dashboardBackup,
    dashboardCapabilities: { showWriteControls },
  } = pluginServices.getServices();

  const isEditingFirstDashboard = useMemo(
    () => useSessionStorageIntegration && unsavedDashboardIds.length === 1,
    [unsavedDashboardIds.length, useSessionStorageIntegration]
  );

  const getEmptyAction = useCallback(() => {
    if (!isEditingFirstDashboard) {
      return (
        <EuiButton
          onClick={createItem}
          fill
          iconType="plusInCircle"
          data-test-subj="newItemButton"
          disabled={disableCreateDashboardButton}
        >
          {noItemsStrings.getCreateNewDashboardText()}
        </EuiButton>
      );
    }
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={() =>
              confirmDiscardUnsavedChanges(() => {
                dashboardBackup.clearState(DASHBOARD_PANELS_UNSAVED_ID);
                setUnsavedDashboardIds(dashboardBackup.getDashboardIdsWithUnsavedChanges());
              })
            }
            data-test-subj="discardDashboardPromptButton"
            aria-label={dashboardUnsavedListingStrings.getDiscardAriaLabel(getNewDashboardTitle())}
          >
            {dashboardUnsavedListingStrings.getDiscardTitle()}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="pencil"
            color="primary"
            data-test-subj="newItemButton"
            onClick={() => goToDashboard()}
            aria-label={dashboardUnsavedListingStrings.getEditAriaLabel(getNewDashboardTitle())}
          >
            {dashboardUnsavedListingStrings.getEditTitle()}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    isEditingFirstDashboard,
    createItem,
    disableCreateDashboardButton,
    dashboardBackup,
    goToDashboard,
    setUnsavedDashboardIds,
  ]);

  if (!showWriteControls) {
    return (
      <EuiEmptyPrompt
        iconType="glasses"
        title={
          <h1 id="dashboardListingHeading" data-test-subj="emptyListPrompt">
            {noItemsStrings.getReadonlyTitle()}
          </h1>
        }
        body={<p>{noItemsStrings.getReadonlyBody()}</p>}
      />
    );
  }

  return (
    <EuiEmptyPrompt
      iconType="dashboardApp"
      title={
        <h1 id="dashboardListingHeading" data-test-subj="emptyListPrompt">
          {isEditingFirstDashboard
            ? noItemsStrings.getReadEditInProgressTitle()
            : noItemsStrings.getReadEditTitle()}
        </h1>
      }
      body={
        <>
          <p>{noItemsStrings.getReadEditDashboardDescription()}</p>
          {!isEditingFirstDashboard && (
            <p>
              <FormattedMessage
                id="dashboard.listing.createNewDashboard.newToKibanaDescription"
                defaultMessage="New to Kibana? {sampleDataInstallLink} to take a test drive."
                values={{
                  sampleDataInstallLink: (
                    <EuiLink
                      onClick={() =>
                        coreServices.application.navigateToApp('home', {
                          path: '#/tutorial_directory/sampleData',
                        })
                      }
                    >
                      {noItemsStrings.getSampleDataLinkText()}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          )}
        </>
      }
      actions={getEmptyAction()}
    />
  );
};
