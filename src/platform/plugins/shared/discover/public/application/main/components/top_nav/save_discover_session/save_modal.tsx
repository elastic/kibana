/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiSwitch, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OnSaveProps, SaveResult } from '@kbn/saved-objects-plugin/public';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';
import type { DiscoverServices } from '../../../../../build_services';
import { ProjectRoutingSwitch } from './project_routing_switch';

export type DiscoverSessionSaveModalOnSaveCallback = (
  props: OnSaveProps & {
    newTimeRestore: boolean;
    newProjectRoutingRestore: boolean;
    newTags: string[];
  }
) => Promise<SaveResult>;

export interface DiscoverSessionSaveModalProps {
  isTimeBased: boolean;
  showStoreProjectRoutingOnSave: boolean;
  services: DiscoverServices;
  title: string;
  showCopyOnSave: boolean;
  initialCopyOnSave?: boolean;
  description?: string;
  timeRestore?: boolean;
  projectRoutingRestore?: boolean;
  tags: string[];
  onSave: DiscoverSessionSaveModalOnSaveCallback;
  onClose: () => void;
  managed: boolean;
}

export const DiscoverSessionSaveModal: React.FC<DiscoverSessionSaveModalProps> = ({
  isTimeBased,
  showStoreProjectRoutingOnSave,
  services: { savedObjectsTagging, discoverFeatureFlags },
  title,
  description,
  tags,
  showCopyOnSave,
  initialCopyOnSave,
  timeRestore: savedTimeRestore,
  projectRoutingRestore: savedProjectRoutingRestore,
  onSave,
  onClose,
  managed,
}) => {
  const [timeRestore, setTimeRestore] = useState(Boolean(isTimeBased && savedTimeRestore));
  const [projectRoutingRestore, setProjectRoutingRestore] = useState(
    Boolean(savedProjectRoutingRestore)
  );
  const [currentTags, setCurrentTags] = useState(tags);
  const tabsEnabled = discoverFeatureFlags.getTabsEnabled();

  const onModalSave = async (params: OnSaveProps) => {
    await onSave({
      ...params,
      newTimeRestore: timeRestore,
      newProjectRoutingRestore: projectRoutingRestore,
      newTags: currentTags,
    });
  };

  const tagSelector = savedObjectsTagging ? (
    <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
      initialSelection={currentTags}
      onTagsSelected={(newTags) => {
        setCurrentTags(newTags);
      }}
    />
  ) : null;

  const timeSwitch = isTimeBased ? (
    <EuiFormRow fullWidth>
      <EuiSwitch
        data-test-subj="storeTimeWithSearch"
        checked={timeRestore}
        onChange={(event) => setTimeRestore(event.target.checked)}
        label={
          <FormattedMessage
            id="discover.topNav.saveModal.storeTimeWithSearchToggleLabel"
            defaultMessage="Include time range and refresh interval customizations"
          />
        }
      />
    </EuiFormRow>
  ) : null;

  const options = (
    <>
      {tagSelector}
      {showStoreProjectRoutingOnSave && (
        <ProjectRoutingSwitch checked={projectRoutingRestore} onChange={setProjectRoutingRestore} />
      )}
      {timeSwitch}
    </>
  );

  return (
    <SavedObjectSaveModal
      customModalTitle={
        <>
          <FormattedMessage
            id="discover.localMenu.saveModalTitle"
            defaultMessage="Save Discover session"
          />
          {tabsEnabled && (
            <EuiText size="xs" color="subdued">
              <EuiSpacer size="xs" />
              <p>
                {i18n.translate('discover.localMenu.saveModalSubtitle', {
                  defaultMessage: 'All open tabs will be saved to this session',
                })}
              </p>
            </EuiText>
          )}
        </>
      }
      title={title}
      showCopyOnSave={showCopyOnSave}
      initialCopyOnSave={initialCopyOnSave}
      description={description}
      objectType={i18n.translate('discover.localMenu.saveSaveSearchObjectType', {
        defaultMessage: 'Discover session',
      })}
      showDescription={true}
      options={options}
      onSave={onModalSave}
      onClose={onClose}
      mustCopyOnSaveMessage={
        managed
          ? i18n.translate('discover.localMenu.mustCopyOnSave', {
              defaultMessage:
                'Elastic manages this Discover session. Save any changes to a new Discover session.',
            })
          : undefined
      }
    />
  );
};
