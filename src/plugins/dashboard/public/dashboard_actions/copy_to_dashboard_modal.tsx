/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, useState } from 'react';
import { omit } from 'lodash';

import {
  EuiRadio,
  EuiButton,
  EuiSpacer,
  EuiFormRow,
  EuiModalBody,
  EuiButtonEmpty,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import {
  EmbeddablePackageState,
  IEmbeddable,
  PanelNotFoundError,
} from '@kbn/embeddable-plugin/public';
import { LazyDashboardPicker, withSuspense } from '@kbn/presentation-util-plugin/public';

import { DashboardPanelState } from '../../common';
import { pluginServices } from '../services/plugin_services';
import { type DashboardContainer } from '../dashboard_container';
import { dashboardCopyToDashboardActionStrings } from './_dashboard_actions_strings';
import { createDashboardEditUrl, CREATE_NEW_DASHBOARD_URL } from '../dashboard_constants';

interface CopyToDashboardModalProps {
  embeddable: IEmbeddable;
  dashboardId?: string;
  closeModal: () => void;
}

const DashboardPicker = withSuspense(LazyDashboardPicker);

export function CopyToDashboardModal({
  dashboardId,
  embeddable,
  closeModal,
}: CopyToDashboardModalProps) {
  const {
    embeddable: { getStateTransfer },
    dashboardCapabilities: { createNew: canCreateNew, showWriteControls: canEditExisting },
  } = pluginServices.getServices();
  const stateTransfer = getStateTransfer();

  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing'>('existing');
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );

  const onSubmit = useCallback(() => {
    const dashboard = embeddable.getRoot() as DashboardContainer;
    const panelToCopy = dashboard.getInput().panels[embeddable.id] as DashboardPanelState;
    if (!panelToCopy) {
      throw new PanelNotFoundError();
    }

    const state: EmbeddablePackageState = {
      type: embeddable.type,
      input: {
        ...omit(panelToCopy.explicitInput, 'id'),
      },
      size: {
        width: panelToCopy.gridData.w,
        height: panelToCopy.gridData.h,
      },
    };

    const path =
      dashboardOption === 'existing' && selectedDashboard
        ? `#${createDashboardEditUrl(selectedDashboard.id, true)}`
        : `#${CREATE_NEW_DASHBOARD_URL}`;

    closeModal();
    stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
      state,
      path,
    });
  }, [dashboardOption, embeddable, selectedDashboard, stateTransfer, closeModal]);

  const titleId = 'copyToDashboardTitle';
  const descriptionId = 'copyToDashboardDescription';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId} component="h2">
          {dashboardCopyToDashboardActionStrings.getDisplayName()}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>
          <EuiFormRow hasChildLabel={false}>
            <div data-test-subj="add-to-dashboard-options">
              {canEditExisting && (
                <>
                  <EuiRadio
                    checked={dashboardOption === 'existing'}
                    data-test-subj="add-to-existing-dashboard-option"
                    id="existing-dashboard-option"
                    name="dashboard-option"
                    label={dashboardCopyToDashboardActionStrings.getExistingDashboardOption()}
                    onChange={() => setDashboardOption('existing')}
                  />
                  <EuiSpacer size="s" />
                  <div>
                    <DashboardPicker
                      isDisabled={dashboardOption !== 'existing'}
                      idsToOmit={dashboardId ? [dashboardId] : undefined}
                      onChange={(dashboard) => {
                        setSelectedDashboard(dashboard);
                        setDashboardOption('existing');
                      }}
                    />
                  </div>
                  <EuiSpacer size="s" />
                </>
              )}
              {canCreateNew && (
                <>
                  <EuiRadio
                    checked={dashboardOption === 'new'}
                    data-test-subj="add-to-new-dashboard-option"
                    id="new-dashboard-option"
                    name="dashboard-option"
                    disabled={!dashboardId}
                    label={dashboardCopyToDashboardActionStrings.getNewDashboardOption()}
                    onChange={() => setDashboardOption('new')}
                  />
                  <EuiSpacer size="s" />
                </>
              )}
            </div>
          </EuiFormRow>
        </>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelCopyToButton" onClick={() => closeModal()}>
          {dashboardCopyToDashboardActionStrings.getCancelButtonName()}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="confirmCopyToButton"
          onClick={onSubmit}
          disabled={dashboardOption === 'existing' && !selectedDashboard}
        >
          {dashboardCopyToDashboardActionStrings.getAcceptButtonName()}
        </EuiButton>
      </EuiModalFooter>
    </div>
  );
}
