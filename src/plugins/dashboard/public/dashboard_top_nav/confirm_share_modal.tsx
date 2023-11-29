/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SpacesApi } from '@kbn/spaces-plugin/public';
import React, { useMemo } from 'react';

export const ConfirmShareModal = ({
  canSave,
  namespaces,
  spacesApi,
  noun,
  title,
  onSave,
  onClone,
  onCancel,
  onClose,
}: {
  canSave: boolean;
  namespaces: string[];
  noun: string;
  spacesApi: SpacesApi;
  title: string;
  onCancel?: () => void;
  onClone: () => void;
  onClose: () => void;
  onSave: () => void;
}) => {
  const SpacesContextWrapper = spacesApi.ui.components.getSpacesContextProvider;

  const LazySpaceList = useMemo(
    () => spacesApi.ui.components.getSpaceList,
    [spacesApi.ui.components.getSpaceList]
  );

  let message;

  if (canSave) {
    message = i18n.translate('xpack.spaces.confirmShareModal.shareableChangesDescription', {
      defaultMessage: `This {noun} is shared between {spacesCount} spaces. Any changes will also
        be reflected in those spaces. Save as a new {noun} if you don't want the changes to be
        reflected in the rest of spaces.`,
      values: { spacesCount: namespaces.length, noun },
    });
  } else {
    message = i18n.translate('xpack.spaces.confirmShareModal.unshareableChangesDescription', {
      defaultMessage: `This {noun} is shared between {spacesCount} spaces, and some of your changes cannot 
          be shared. Please save as a new {noun} to save your changes into the current space.`,
      values: { spacesCount: namespaces.length, noun },
    });
  }

  return (
    <SpacesContextWrapper>
      <EuiModal onClose={onClose}>
        <EuiModalHeader>
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiFlexItem>
              <EuiTitle>
                <h1>{title}</h1>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <p>{message}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeader>
        <EuiModalBody>
          <LazySpaceList
            namespaces={namespaces}
            behaviorContext="outside-space"
            direction="vertical"
            displayLimit={4}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="danger"
                onClick={() => {
                  if (onCancel) onCancel();
                  onClose();
                }}
              >
                <FormattedMessage
                  id="xpack.spaces.confirmSaveModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                color="primary"
                fill={!canSave}
                onClick={() => {
                  onClone();
                  onClose();
                }}
              >
                <FormattedMessage
                  id="xpack.spaces.confirmSaveModal.cloneButtonLabel"
                  defaultMessage="Clone"
                />
              </EuiButton>
            </EuiFlexItem>
            {canSave ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  fill
                  onClick={() => {
                    onSave();
                    onClose();
                  }}
                >
                  <FormattedMessage
                    id="xpack.spaces.confirmSaveModal.SaveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    </SpacesContextWrapper>
  );
};
