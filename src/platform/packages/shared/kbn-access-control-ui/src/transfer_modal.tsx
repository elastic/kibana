/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { Principal } from '@kbn/access-control';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { AccessList } from './access_list';
import type { AccessCopy } from './copy';
import { PrincipalPicker } from './principal_picker';
import type { SuggestedUser } from './types';

export interface TransferModalProps {
  owner?: Principal;
  /** Whether the current user is the owner, who loses access management with the transfer. */
  isOwnerSelf: boolean;
  suggestPrincipals: (name: string, signal: AbortSignal) => Promise<SuggestedUser[]>;
  copy: AccessCopy;
  onTransfer: (owner: Principal) => Promise<void>;
  onClose: () => void;
}

/**
 * Picks a new owner and confirms what the current owner loses.
 */
export const TransferModal = ({
  owner,
  isOwnerSelf,
  suggestPrincipals,
  copy,
  onTransfer,
  onClose,
}: TransferModalProps) => {
  const titleId = useGeneratedHtmlId();
  const [newOwner, setNewOwner] = useState<{
    principal: Principal;
    user?: UserProfileWithAvatar;
  }>();
  const [isTransferring, setIsTransferring] = useState(false);

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj="accessPanelTransferModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('accessControlUi.transfer.title', {
            defaultMessage: 'Transfer ownership',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          {i18n.translate('accessControlUi.transfer.description', {
            defaultMessage:
              'The new owner controls who can access this {objectNoun}. The previous owner keeps only the access that general access gives everyone.',
            values: { objectNoun: copy.objectNoun },
          })}
        </EuiText>
        <EuiSpacer size="m" />
        {newOwner ? (
          <AccessList
            owner={newOwner.principal}
            entries={[]}
            entryLevels={[]}
            profiles={new Map(newOwner.user ? [[newOwner.user.uid, newOwner.user]] : [])}
            warnings={new Set()}
            copy={copy}
          />
        ) : (
          <PrincipalPicker
            label={i18n.translate('accessControlUi.transfer.newOwner', {
              defaultMessage: 'New owner',
            })}
            suggest={suggestPrincipals}
            excluded={owner ? [owner] : []}
            onSelect={(principal, user) => setNewOwner({ principal, user })}
            data-test-subj="accessPanelTransferPicker"
          />
        )}
        {isOwnerSelf ? (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              announceOnMount
              size="s"
              title={i18n.translate('accessControlUi.transfer.selfWarning', {
                defaultMessage: "You won't be able to manage access to this {objectNoun} anymore.",
                values: { objectNoun: copy.objectNoun },
              })}
            />
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('accessControlUi.transfer.cancel', { defaultMessage: 'Cancel' })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          color="warning"
          isDisabled={!newOwner}
          isLoading={isTransferring}
          data-test-subj="accessPanelTransferConfirm"
          onClick={async () => {
            if (newOwner) {
              setIsTransferring(true);
              try {
                await onTransfer(newOwner.principal);
              } finally {
                setIsTransferring(false);
              }
            }
          }}
        >
          {i18n.translate('accessControlUi.transfer.confirm', { defaultMessage: 'Transfer' })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
