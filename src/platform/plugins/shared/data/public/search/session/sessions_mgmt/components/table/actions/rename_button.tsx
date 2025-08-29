/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import type { IClickActionDescriptor } from './types';
import type { OnActionDismiss } from './types';
import type { UISession } from '../../../types';
import { BACKGROUND_SEARCH_FEATURE_FLAG_KEY } from '../../../../constants';

interface RenameButtonProps {
  searchSession: UISession;
  api: SearchSessionsMgmtAPI;
  hasBackgroundSearchEnabled: boolean;
}

const RenameDialog = ({
  onActionDismiss,
  ...props
}: RenameButtonProps & { onActionDismiss: OnActionDismiss }) => {
  const { api, searchSession, hasBackgroundSearchEnabled } = props;
  const { id, name: originalName } = searchSession;
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState(originalName);

  const modalTitleId = useGeneratedHtmlId();

  const title = i18n.translate('data.mgmt.searchSessions.renameModal.title', {
    defaultMessage: 'Edit search session name',
  });
  const bgsTitle = i18n.translate('data.mgmt.searchSessions.renameModal.backgroundSearchTitle', {
    defaultMessage: 'Edit background search name',
  });

  const confirm = i18n.translate('data.mgmt.searchSessions.renameModal.renameButton', {
    defaultMessage: 'Save',
  });
  const cancel = i18n.translate('data.mgmt.searchSessions.renameModal.cancelButton', {
    defaultMessage: 'Cancel',
  });

  const label = i18n.translate('data.mgmt.searchSessions.renameModal.searchSessionNameInputLabel', {
    defaultMessage: 'Search session name',
  });
  const bgsLabel = i18n.translate(
    'data.mgmt.searchSessions.renameModal.backgroundSearchNameInputLabel',
    {
      defaultMessage: 'Background search name',
    }
  );

  const isNewNameValid = newName && originalName !== newName;

  return (
    <EuiModal
      onClose={onActionDismiss}
      aria-labelledby={modalTitleId}
      initialFocus="[name=newName]"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {hasBackgroundSearchEnabled ? bgsTitle : title}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm>
          <EuiFormRow label={hasBackgroundSearchEnabled ? bgsLabel : label}>
            <EuiFieldText
              name="newName"
              placeholder={originalName}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onActionDismiss} data-test-subj="cancelEditName">
          {cancel}
        </EuiButtonEmpty>

        <EuiButton
          disabled={!isNewNameValid}
          onClick={async () => {
            if (!isNewNameValid) return;
            setIsLoading(true);
            await api.sendRename(id, newName);
            setIsLoading(false);
            onActionDismiss();
          }}
          fill
          isLoading={isLoading}
        >
          {confirm}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const createRenameActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: 'pencil',
  label: <FormattedMessage id="data.mgmt.searchSessions.actionRename" defaultMessage="Edit name" />,
  onClick: async () => {
    const ref = core.overlays.openModal(
      toMountPoint(
        <RenameDialog
          hasBackgroundSearchEnabled={core.featureFlags.getBooleanValue(
            BACKGROUND_SEARCH_FEATURE_FLAG_KEY,
            false
          )}
          onActionDismiss={() => ref?.close()}
          api={api}
          searchSession={uiSession}
        />,
        core
      )
    );
    await ref.onClose;
  },
});
