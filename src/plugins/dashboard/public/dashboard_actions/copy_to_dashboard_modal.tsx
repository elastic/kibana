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
  EuiText,
  EuiRadio,
  EuiPanel,
  EuiButton,
  EuiSpacer,
  EuiFormRow,
  EuiFocusTrap,
  EuiModalBody,
  EuiButtonEmpty,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { IEmbeddable, PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import { LazyDashboardPicker, withSuspense } from '@kbn/presentation-util-plugin/public';

import { DashboardPanelState } from '../../common';
import { pluginServices } from '../services/plugin_services';
import { type DashboardContainer } from '../dashboard_container';
import { dashboardCopyToDashboardActionStrings } from './_dashboard_actions_strings';
import { createDashboardEditUrl, CREATE_NEW_DASHBOARD_URL } from '../dashboard_constants';

interface CopyToDashboardModalProps {
  PresentationUtilContext: React.FC;
  embeddable: IEmbeddable;
  dashboardId?: string;
  closeModal: () => void;
}

const DashboardPicker = withSuspense(LazyDashboardPicker);

export function CopyToDashboardModal({
  PresentationUtilContext,
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

    const state = {
      type: embeddable.type,
      input: {
        ...omit(panelToCopy.explicitInput, 'id'),
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
    <EuiFocusTrap clickOutsideDisables={true}>
      <EuiOutsideClickDetector onOutsideClick={closeModal}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <PresentationUtilContext>
            <EuiModalHeader>
              <EuiModalHeaderTitle id={titleId} component="h2">
                {dashboardCopyToDashboardActionStrings.getDisplayName()}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <>
                <EuiText>
                  <p id={descriptionId}>{dashboardCopyToDashboardActionStrings.getDescription()}</p>
                </EuiText>
                <EuiSpacer />
                <EuiFormRow hasChildLabel={false}>
                  <EuiPanel
                    color="subdued"
                    hasShadow={false}
                    data-test-subj="add-to-dashboard-options"
                  >
                    <div>
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
                          <div className="savAddDashboard__searchDashboards">
                            <DashboardPicker
                              isDisabled={dashboardOption !== 'existing'}
                              idsToOmit={dashboardId ? [dashboardId] : undefined}
                              onChange={(dashboard) => setSelectedDashboard(dashboard)}
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
                  </EuiPanel>
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
          </PresentationUtilContext>
        </div>
      </EuiOutsideClickDetector>
    </EuiFocusTrap>
  );
}
