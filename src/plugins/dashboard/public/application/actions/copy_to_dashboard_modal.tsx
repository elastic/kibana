/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState } from 'react';
import {
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DashboardCopyToCapabilities } from './copy_to_dashboard_action';
import { DashboardPicker } from '../../services/presentation_util';

interface CopyToDashboardModalProps {
  PresentationUtilContext: React.FC;
  capabilities: DashboardCopyToCapabilities;
}

export function CopyToDashboardModal({
  PresentationUtilContext,
  capabilities,
}: CopyToDashboardModalProps) {
  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing'>('existing');
  const [selectedDashboard, setSelectedDashboard] = useState<{ id: string; name: string } | null>(
    null
  );

  return (
    <PresentationUtilContext>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Modal title</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>
          <EuiFormRow label="testLabel" hasChildLabel={false}>
            <EuiPanel color="subdued" hasShadow={false} data-test-subj="add-to-dashboard-options">
              <div>
                {capabilities.canEditExisting && (
                  <>
                    {' '}
                    <EuiRadio
                      checked={dashboardOption === 'existing'}
                      id="existing-dashboard-option"
                      name="dashboard-option"
                      label={i18n.translate(
                        'presentationUtil.saveModalDashboard.existingDashboardOptionLabel',
                        {
                          defaultMessage: 'Existing',
                        }
                      )}
                      onChange={() => setDashboardOption('existing')}
                    />
                    <div className="savAddDashboard__searchDashboards">
                      <DashboardPicker
                        isDisabled={dashboardOption !== 'existing'}
                        onChange={(dashboard) => setSelectedDashboard(dashboard)}
                      />
                    </div>
                    <EuiSpacer size="s" />
                  </>
                )}
                {capabilities.canCreateNew && (
                  <>
                    {' '}
                    <EuiRadio
                      checked={dashboardOption === 'new'}
                      id="new-dashboard-option"
                      name="dashboard-option"
                      label={i18n.translate(
                        'presentationUtil.saveModalDashboard.newDashboardOptionLabel',
                        {
                          defaultMessage: 'New',
                        }
                      )}
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

      <EuiModalFooter>footer</EuiModalFooter>
    </PresentationUtilContext>
  );
}
