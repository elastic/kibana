/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, type FC } from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export type DiscoverSessionSaveDashboardModalSaveProps = OnSaveProps & {
  addToLibrary?: boolean;
  dashboardId?: string | null;
  newTags: string[];
  newTimeRestore: boolean;
};

export interface DiscoverSessionSaveDashboardModalProps {
  description?: string;
  hideDashboardOptions?: boolean;
  initialTags?: string[];
  initialTimeRestore?: boolean;
  isTimeBased: boolean;
  managed?: boolean;
  onClose: () => void;
  onCopyOnSaveChange?: (newCopyOnSave: boolean) => void;
  onSave: (props: DiscoverSessionSaveDashboardModalSaveProps) => Promise<void>;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  sessionId?: string;
  title: string;
}

export const DiscoverSessionSaveDashboardModal: FC<DiscoverSessionSaveDashboardModalProps> = ({
  description,
  hideDashboardOptions,
  initialTags = [],
  initialTimeRestore,
  isTimeBased,
  managed,
  onClose,
  onCopyOnSaveChange,
  onSave,
  savedObjectsTagging,
  sessionId,
  title,
}) => {
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [timeRestore, setTimeRestore] = useState(Boolean(isTimeBased && initialTimeRestore));

  const customModalTitle = (
    <>
      <FormattedMessage
        id="discover.localMenu.saveModalTitle"
        defaultMessage="Save Discover session"
      />
      <EuiText size="xs" color="subdued">
        <EuiSpacer size="s" />
        <p>
          {i18n.translate('discover.localMenu.saveModalSubtitle', {
            defaultMessage: 'All open tabs will be saved to this session',
          })}
        </p>
      </EuiText>
    </>
  );

  const tagSelector = savedObjectsTagging ? (
    <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
      initialSelection={initialTags}
      markOptional
      onTagsSelected={setSelectedTags}
    />
  ) : null;

  const timeSwitch = isTimeBased ? (
    <EuiFormRow
      helpText={
        <FormattedMessage
          id="discover.topNav.saveModal.storeTimeWithSearchToggleDescription"
          defaultMessage="Update the time filter and refresh interval to the current selection when using this session."
        />
      }
    >
      <EuiSwitch
        checked={timeRestore}
        data-test-subj="storeTimeWithSearch"
        label={
          <FormattedMessage
            id="discover.topNav.saveModal.storeTimeWithSearchToggleLabel"
            defaultMessage="Store time with Discover session"
          />
        }
        onChange={(e) => setTimeRestore(e.target.checked)}
      />
    </EuiFormRow>
  ) : null;

  const tagOptions = (
    <>
      {tagSelector}
      {timeSwitch}
    </>
  );

  const handleSave = useCallback<SaveModalDashboardProps['onSave']>(
    async (saveOptions) => {
      await onSave({
        ...saveOptions,
        newTags: selectedTags ?? [],
        newTimeRestore: timeRestore ?? false,
      });
    },
    [onSave, selectedTags, timeRestore]
  );

  return (
    <SavedObjectSaveModalDashboard
      canSaveByReference={true}
      customModalTitle={customModalTitle}
      documentInfo={{ description, id: sessionId, title }}
      forceSaveByReference={true}
      hideDashboardOptions={hideDashboardOptions}
      initialDashboardOption={null}
      mustCopyOnSaveMessage={
        managed
          ? i18n.translate('discover.localMenu.mustCopyOnSave', {
              defaultMessage:
                'Elastic manages this Discover session. Save any changes to a new Discover session.',
            })
          : undefined
      }
      objectType={i18n.translate('discover.localMenu.saveSaveSearchObjectType', {
        defaultMessage: 'Discover session',
      })}
      onClose={onClose}
      onCopyOnSaveChangeCb={onCopyOnSaveChange}
      onSave={handleSave}
      tagOptions={tagOptions}
    />
  );
};
