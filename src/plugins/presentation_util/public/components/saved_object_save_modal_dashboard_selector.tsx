/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiRadio,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiCheckbox,
} from '@elastic/eui';

import DashboardPicker, { DashboardPickerProps } from './dashboard_picker';

import './saved_object_save_modal_dashboard.scss';

export interface SaveModalDashboardSelectorProps {
  copyOnSave: boolean;
  documentId?: string;
  onSelectDashboard: DashboardPickerProps['onChange'];
  canSaveByReference: boolean;
  setAddToLibrary: (selected: boolean) => void;
  isAddToLibrarySelected: boolean;
  dashboardOption: 'new' | 'existing' | null;
  onChange: (dashboardOption: 'new' | 'existing' | null) => void;
}

export function SaveModalDashboardSelector(props: SaveModalDashboardSelectorProps) {
  const {
    documentId,
    onSelectDashboard,
    canSaveByReference,
    setAddToLibrary,
    isAddToLibrarySelected,
    dashboardOption,
    onChange,
    copyOnSave,
  } = props;
  const isDisabled = !copyOnSave && !!documentId;

  return (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="presentationUtil.saveModalDashboard.addToDashboardLabel"
            defaultMessage="Add to dashboard"
          />
        }
        hasChildLabel={false}
      >
        <>
          <EuiPanel color="subdued" hasShadow={false} data-test-subj="add-to-dashboard-options">
            <div>
              <>
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
                  onChange={() => onChange('existing')}
                  disabled={isDisabled}
                />
                <div className="savAddDashboard__searchDashboards">
                  <DashboardPicker
                    isDisabled={dashboardOption !== 'existing'}
                    onChange={onSelectDashboard}
                  />
                </div>
                <EuiSpacer size="s" />
              </>
              <>
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
                  onChange={() => onChange('new')}
                  disabled={isDisabled}
                />
                <EuiSpacer size="s" />
              </>
              <EuiRadio
                checked={dashboardOption === null}
                id="add-to-library-option"
                name="dashboard-option"
                label={i18n.translate(
                  'presentationUtil.saveModalDashboard.noDashboardOptionLabel',
                  {
                    defaultMessage: 'None',
                  }
                )}
                onChange={() => {
                  setAddToLibrary(true);
                  onChange(null);
                }}
                disabled={isDisabled || !canSaveByReference}
              />
            </div>
          </EuiPanel>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false} data-test-subj="add-to-library-checkbox">
              <EuiCheckbox
                id="add-to-library-checkbox"
                label={i18n.translate('presentationUtil.saveModalDashboard.libraryOptionLabel', {
                  defaultMessage: 'Add to library',
                })}
                checked={isAddToLibrarySelected}
                disabled={dashboardOption === null || isDisabled || !canSaveByReference}
                onChange={(event) => setAddToLibrary(event.target.checked)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="iInCircle"
                content={
                  <FormattedMessage
                    id="presentationUtil.saveModalDashboard.dashboardInfoTooltip"
                    defaultMessage="items added to the Visualize Library are available to all dashboards. Edits to a library item appear everywhere it is used."
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      </EuiFormRow>
    </>
  );
}
