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

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiOverlayMask,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface LinkedSearchProps {
  savedSearchId: string;
  savedSearchTitle: string;
  unlink: () => void;
}

export function LinkedSearch({ savedSearchId, savedSearchTitle, unlink }: LinkedSearchProps) {
  const [showModal, setShowModal] = useState(false);
  const onCLickUnlink = useCallback(() => setShowModal(true), []);
  const onClickCancelModal = useCallback(() => setShowModal(false), []);
  const onClickConfirmModal = useCallback(() => {
    setShowModal(false);
    unlink();
  }, [unlink]);

  const unlinkText = i18n.translate('kbn.visualize.linkedToSearch.unlinkButtonTooltip', {
    defaultMessage: 'Click to unlink from Saved Search',
  });

  return (
    <>
      <EuiFlexGroup className="visEditor__linkedMessage" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText>
            <FormattedMessage
              id="kbn.visualize.linkedToSearchInfoText"
              defaultMessage="Linked to saved search"
            />
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiLink href={`#/discover/${savedSearchId}`}>
            <EuiText>{` ${savedSearchTitle} `}</EuiText>
          </EuiLink>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip content={unlinkText} position="right">
            <EuiButtonIcon
              aria-label={unlinkText}
              data-test-subj="unlinkSavedSearch"
              iconType="link"
              onClick={onCLickUnlink}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      {showModal && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('kbn.visualize.unlinkModalTitle', {
              defaultMessage: 'Unlink from saved search',
            })}
            onCancel={onClickCancelModal}
            onConfirm={onClickConfirmModal}
            cancelButtonText={i18n.translate('kbn.visualize.unlinkCancelButtonText', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate('kbn.visualize.unlinkConfirmButtonText', {
              defaultMessage: 'Unlink',
            })}
            defaultFocusedButton="confirm"
          >
            <p>
              <FormattedMessage
                id="kbn.visualize.unlinkHelpText"
                defaultMessage="Are you sure you want to unlink from {savedSearchTitle} saved search?"
                values={{
                  savedSearchTitle: <strong>{savedSearchTitle}</strong>,
                }}
              />
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
}
