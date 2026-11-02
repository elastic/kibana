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
  EuiIllustration,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { dashboard as dashboardIllustration } from '@elastic/eui-illustrations';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../services/dashboard_backup_service';
import { getDashboardBackupService } from '../services/dashboard_api_services';
import { coreServices } from '../services/kibana_services';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import {
  dashboardUnsavedListingStrings,
  getNewDashboardTitle,
  noItemsStrings,
} from './_dashboard_listing_strings';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';
import type { DashboardListingProps } from './types';

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
  const { euiTheme } = useEuiTheme();
  // Same size as the visualization and annotation tab illustrations
  const listingIllustrationSize = euiTheme.base * 8;
  // This artwork is wide and short, so it's drawn 1.2x larger to look the same size as the others.
  // The negative block margins trim its extra empty space so the heading stays aligned across tabs.
  const illustrationSize = listingIllustrationSize * 1.2;
  const isEditingFirstDashboard = useMemo(
    () => useSessionStorageIntegration && unsavedDashboardIds.length === 1,
    [unsavedDashboardIds.length, useSessionStorageIntegration]
  );

  const getEmptyAction = useCallback(() => {
    if (!isEditingFirstDashboard) {
      return (
        <EuiButton
          onClick={createItem}
          color="text"
          iconType="plusCircle"
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
                const dashboardBackupService = getDashboardBackupService();
                dashboardBackupService.clearState(DASHBOARD_PANELS_UNSAVED_ID);
                setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
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
    goToDashboard,
    setUnsavedDashboardIds,
  ]);

  if (!getDashboardCapabilities().showWriteControls) {
    return (
      <EuiEmptyPrompt
        iconType="readOnly"
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
      icon={
        <EuiIllustration
          type={dashboardIllustration}
          alt=""
          fullWidth={false}
          css={{
            inlineSize: illustrationSize,
            marginBlock: (listingIllustrationSize - illustrationSize) / 2,
          }}
        />
      }
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
