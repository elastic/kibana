/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiSwitch, EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';

import type { DashboardSaveOptions } from '../../../types';
import { pluginServices } from '../../../../services/plugin_services';

/**
 * TODO: Portable Dashboard followup, use redux for the state.
 * https://github.com/elastic/kibana/issues/147490
 */

interface DashboardSaveModalProps {
  onSave: ({
    newTitle,
    newDescription,
    newCopyOnSave,
    newTags,
    newTimeRestore,
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
}) => {
  const [selectedTags, setSelectedTags] = React.useState<string[]>(tags ?? []);
  const [persistSelectedTimeInterval, setPersistSelectedTimeInterval] = React.useState(timeRestore);

  const saveDashboard = React.useCallback<SaveDashboardHandler>(
    ({ newTitle, newDescription, newCopyOnSave, isTitleDuplicateConfirmed, onTitleDuplicate }) => {
      onSave({
        newTitle,
        newDescription,
        newCopyOnSave,
        newTimeRestore: persistSelectedTimeInterval,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
        newTags: selectedTags,
      });
    },
    [onSave, persistSelectedTimeInterval, selectedTags]
  );

  const renderDashboardSaveOptions = useCallback(() => {
    const {
      savedObjectsTagging: { components },
    } = pluginServices.getServices();

    const tagSelector = components ? (
      <components.SavedObjectSaveModalTagSelector
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
      </Fragment>
    );
  }, [persistSelectedTimeInterval, selectedTags, showStoreTimeOnSave]);

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
