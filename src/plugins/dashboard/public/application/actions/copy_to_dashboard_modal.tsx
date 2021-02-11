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
} from '@elastic/eui';
import { DashboardCopyToCapabilities } from './copy_to_dashboard_action';
import { DashboardPicker } from '../../services/presentation_util';
import { dashboardCopyToDashboardAction } from '../../dashboard_strings';
import { EmbeddableStateTransfer, IEmbeddable } from '../../services/embeddable';
import { createDashboardEditUrl, DashboardConstants } from '../..';

interface CopyToDashboardModalProps {
  capabilities: DashboardCopyToCapabilities;
  stateTransfer: EmbeddableStateTransfer;
  PresentationUtilContext: React.FC;
  embeddable: IEmbeddable;
  dashboardId?: string;
  closeModal: () => void;
}

export function CopyToDashboardModal({
  PresentationUtilContext,
  stateTransfer,
  capabilities,
  dashboardId,
  embeddable,
  closeModal,
}: CopyToDashboardModalProps) {
  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing'>('existing');
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );

  const onSubmit = useCallback(() => {
    const state = {
      input: omit(embeddable.getInput(), 'id'),
      type: embeddable.type,
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

  return (
    <PresentationUtilContext>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{dashboardCopyToDashboardAction.getDisplayName()}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>
          <EuiText className="dshCopyToParagraph">
            <p>{dashboardCopyToDashboardAction.getDescription()}</p>
          </EuiText>
          <EuiFormRow hasChildLabel={false}>
            <EuiPanel color="subdued" hasShadow={false} data-test-subj="add-to-dashboard-options">
              <div>
                {capabilities.canEditExisting && (
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
                {capabilities.canCreateNew && (
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
  );
}
