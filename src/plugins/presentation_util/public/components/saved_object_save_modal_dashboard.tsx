/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useEffect, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiFormRow, EuiRadio, EuiIconTip, EuiComboBox, EuiPanel, EuiSpacer } from '@elastic/eui';
import { SavedObjectsClientContract } from '../../../../core/public';
import { SavedObjectDashboard } from '../../../../plugins/dashboard/public';

import {
  OnSaveProps,
  SaveModalState,
  SavedObjectSaveModal,
} from '../../../../plugins/saved_objects/public';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

export interface DashboardSaveModalProps {
  documentInfo: SaveModalDocumentInfo;
  objectType: string;
  onClose: () => void;
  onSave: (props: OnSaveProps & { dashboardId: string | null }) => void;
  savedObjectsClient: SavedObjectsClientContract;
  tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
}

interface DashboardOption {
  label: string;
  value: string;
}

export function SavedObjectSaveModalDashboard(props: DashboardSaveModalProps) {
  const [dashboardOption, setDashboardOption] = useState<'new' | 'existing' | null>('existing');
  const [dashboards, setDashboards] = useState<DashboardOption[]>([]);
  const [isLoadingDashboards, setIsLoadingDashboards] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardOption | null>(null);

  const { documentInfo, savedObjectsClient, tagOptions } = props;

  const fetchDashboards = useCallback(
    async (query) => {
      setIsLoadingDashboards(true);
      setDashboards([]);

      const { savedObjects } = await savedObjectsClient.find<SavedObjectDashboard>({
        type: 'dashboard',
        search: query ? `${query}*` : '',
        searchFields: ['title'],
      });
      if (savedObjects) {
        setDashboards(savedObjects.map((d) => ({ value: d.id, label: d.attributes.title })));
      }
      setIsLoadingDashboards(false);
    },
    [savedObjectsClient]
  );

  // Initial dashboard load
  useEffect(() => {
    fetchDashboards('');
  }, [fetchDashboards]);

  const renderDashboardSelect = (state: SaveModalState) => (
    <>
      <EuiFormRow
        label={
          <>
            <span>
              <FormattedMessage
                id="savedObjects.saveModalDashboard.addToDashboardLabel"
                defaultMessage="Add to dashboard"
              />
            </span>
            <EuiIconTip
              type="iInCircle"
              content={
                <FormattedMessage
                  id="savedObjects.saveModalDashboard.dashboardInfoTooltip"
                  defaultMessage="Items added to a dashboard will not appear in the library and must be edited from the dashboard."
                />
              }
            />
          </>
        }
        hasChildLabel={false}
        style={!state.copyOnSave && documentInfo.id ? { pointerEvents: 'none', opacity: 0.2 } : {}}
      >
        <EuiPanel color="subdued" hasShadow={false}>
          <div>
            <EuiRadio
              checked={dashboardOption === 'existing'}
              id="existing"
              name="dashboard-option"
              label={i18n.translate(
                'savedObjects.saveModalDashboard.existingDashboardOptionLabel',
                {
                  defaultMessage: 'Existing',
                }
              )}
              onChange={() => setDashboardOption('existing')}
            />

            <EuiComboBox
              placeholder={i18n.translate(
                'savedObjects.saveModalDashboard.searchDashboardPlaceholder',
                {
                  defaultMessage: 'Search dashboards...',
                }
              )}
              singleSelection={{ asPlainText: true }}
              options={dashboards || []}
              selectedOptions={!!selectedDashboard ? [selectedDashboard] : undefined}
              onChange={(e) => {
                if (e.length) {
                  setSelectedDashboard({ value: e[0].value || '', label: e[0].label });
                } else {
                  setSelectedDashboard(null);
                }
              }}
              onSearchChange={fetchDashboards}
              isDisabled={dashboardOption !== 'existing'}
              isLoading={isLoadingDashboards}
              style={{ paddingLeft: 24 }}
            />

            <EuiSpacer size="s" />

            <EuiRadio
              checked={dashboardOption === 'new'}
              id="new"
              name="dashboard-option"
              label={i18n.translate('savedObjects.saveModalDashboard.newDashboardOptionLabel', {
                defaultMessage: 'New',
              })}
              onChange={() => setDashboardOption('new')}
            />

            <EuiSpacer size="s" />

            <EuiRadio
              checked={dashboardOption === null}
              id="library"
              name="dashboard-option"
              label={i18n.translate('savedObjects.saveModalDashboard.libraryOptionLabel', {
                defaultMessage: 'No dashboard, but add to library',
              })}
              onChange={() => setDashboardOption(null)}
            />
          </div>
        </EuiPanel>
      </EuiFormRow>
    </>
  );

  const onCopyOnSaveChange = (copyOnSave: boolean) => {
    setDashboardOption(null);
  };

  const onModalSave = (onSaveProps: OnSaveProps) => {
    let dashboardId = null;

    // Don't save with a dashboard ID if we're
    // just updating an existing visualization
    if (!(!onSaveProps.newCopyOnSave && documentInfo.id)) {
      if (dashboardOption === 'existing') {
        dashboardId = selectedDashboard?.value || null;
      } else {
        dashboardId = dashboardOption;
      }
    }

    props.onSave({ ...onSaveProps, dashboardId });
  };

  const saveLibraryLabel = i18n.translate('savedObjects.saveModalDashboard.saveToLibraryLabel', {
    defaultMessage: 'Save and add to library',
  });
  const saveDashboardLabel = i18n.translate(
    'savedObjects.saveModalDashboard.saveAndGoToDashboardLabel',
    {
      defaultMessage: 'Save and go to Dashboard',
    }
  );

  const confirmButtonLabel = dashboardOption === null ? saveLibraryLabel : saveDashboardLabel;

  return (
    <SavedObjectSaveModal
      onSave={onModalSave}
      onClose={props.onClose}
      title={documentInfo.title}
      showCopyOnSave={documentInfo.id ? true : false}
      initialCopyOnSave={Boolean(documentInfo.id)}
      confirmButtonLabel={confirmButtonLabel}
      objectType={props.objectType}
      options={dashboardOption === null ? tagOptions : undefined} // Show tags when not adding to dashboard
      rightOptions={renderDashboardSelect}
      description={documentInfo.description}
      showDescription={true}
      onCopyOnSaveChange={onCopyOnSaveChange}
    />
  );
}
