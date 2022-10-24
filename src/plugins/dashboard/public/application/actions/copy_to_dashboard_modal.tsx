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
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiFocusTrap,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { IEmbeddable, PanelNotFoundError } from '@kbn/embeddable-plugin/public';
import { LazyDashboardPicker, withSuspense } from '@kbn/presentation-util-plugin/public';
import { dashboardCopyToDashboardAction } from '../../dashboard_strings';
import { createDashboardEditUrl, DashboardConstants } from '../..';
import { type DashboardContainer, DashboardPanelState } from '..';
import { pluginServices } from '../../services/plugin_services';

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
        : `#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`;

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
              <EuiModalHeaderTitle>
                <h2 id={titleId}>{dashboardCopyToDashboardAction.getDisplayName()}</h2>
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <>
                <EuiText>
                  <p id={descriptionId}>{dashboardCopyToDashboardAction.getDescription()}</p>
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
                            label={dashboardCopyToDashboardAction.getExistingDashboardOption()}
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
                            label={dashboardCopyToDashboardAction.getNewDashboardOption()}
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
                {dashboardCopyToDashboardAction.getCancelButtonName()}
              </EuiButtonEmpty>
              <EuiButton
                fill
                data-test-subj="confirmCopyToButton"
                onClick={onSubmit}
                disabled={dashboardOption === 'existing' && !selectedDashboard}
              >
                {dashboardCopyToDashboardAction.getAcceptButtonName()}
              </EuiButton>
            </EuiModalFooter>
          </PresentationUtilContext>
        </div>
      </EuiOutsideClickDetector>
    </EuiFocusTrap>
  );
}
