/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';
import { AccessModeContainer } from '../../dashboard_app/access_control';
import type { AccessControl } from '../../dashboard_app/access_control';
import { savedObjectsTaggingService } from '../../services/kibana_services';
import type { DashboardSaveOptions } from './types';

interface DashboardSaveModalProps {
  onSave: ({
    newTitle,
    newDescription,
    newCopyOnSave,
    newTags,
    newTimeRestore,
    newAccessMode,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: DashboardSaveOptions) => void;
  onClose: () => void;
  title: string;
  description: string;
  tags?: string[];
  timeRestore: boolean;
  showCopyOnSave: boolean;
  showStoreTimeOnSave?: boolean;
  customModalTitle?: string;
  accessControl?: AccessControl;
}

type SaveDashboardHandler = (args: {
  newTitle: string;
  newDescription: string;
  newCopyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
  onTitleDuplicate: () => void;
}) => ReturnType<DashboardSaveModalProps['onSave']>;

export const DashboardSaveModal: React.FC<DashboardSaveModalProps> = ({
  customModalTitle,
  description,
  onClose,
  onSave,
  showCopyOnSave,
  showStoreTimeOnSave = true,
  tags,
  title,
  timeRestore,
  accessControl,
}) => {
  const [selectedTags, setSelectedTags] = React.useState<string[]>(tags ?? []);
  const [persistSelectedTimeInterval, setPersistSelectedTimeInterval] = React.useState(timeRestore);
  const [selectedAccessMode, setSelectedAccessMode] = React.useState(
    accessControl?.accessMode ?? 'default'
  );

  const saveDashboard = React.useCallback<SaveDashboardHandler>(
    async ({
      newTitle,
      newDescription,
      newCopyOnSave,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    }) => {
      onSave({
        newTitle,
        newDescription,
        newCopyOnSave,
        newTimeRestore: persistSelectedTimeInterval,
        newAccessMode: selectedAccessMode,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
        newTags: selectedTags,
      });
    },
    [onSave, persistSelectedTimeInterval, selectedAccessMode, selectedTags]
  );

  const renderDashboardSaveOptions = useCallback(() => {
    const savedObjectsTaggingApi = savedObjectsTaggingService?.getTaggingApi();
    const tagSelector = savedObjectsTaggingApi ? (
      <savedObjectsTaggingApi.ui.components.SavedObjectSaveModalTagSelector
        initialSelection={selectedTags}
        onTagsSelected={(selectedTagIds) => {
          setSelectedTags(selectedTagIds);
        }}
        markOptional
      />
    ) : undefined;

    return (
      <Fragment>
        {tagSelector}
        {showStoreTimeOnSave ? (
          <EuiFormRow>
            <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  data-test-subj="storeTimeWithDashboard"
                  checked={persistSelectedTimeInterval}
                  onChange={(event) => {
                    setPersistSelectedTimeInterval(event.target.checked);
                  }}
                  label={
                    <FormattedMessage
                      id="dashboard.topNav.saveModal.storeTimeWithDashboardFormRowLabel"
                      defaultMessage="Store time with dashboard"
                    />
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="dashboard.topNav.saveModal.storeTimeWithDashboardFormRowHelpText"
                      defaultMessage="This changes the time filter to the currently selected time each time this dashboard is loaded."
                    />
                  }
                  position="top"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        ) : null}
        <Fragment>
          <EuiSpacer size="l" />
          <AccessModeContainer
            accessControl={accessControl}
            onChangeAccessMode={setSelectedAccessMode}
          />
        </Fragment>
      </Fragment>
    );
  }, [persistSelectedTimeInterval, selectedTags, showStoreTimeOnSave, accessControl]);

  return (
    <SavedObjectSaveModal
      onSave={saveDashboard}
      onClose={onClose}
      title={title}
      description={description}
      showDescription
      showCopyOnSave={showCopyOnSave}
      initialCopyOnSave={showCopyOnSave}
      objectType={i18n.translate('dashboard.topNav.saveModal.objectType', {
        defaultMessage: 'dashboard',
      })}
      customModalTitle={customModalTitle}
      options={renderDashboardSaveOptions()}
    />
  );
};
