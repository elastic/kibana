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
import { SpacesApi, SpacesContextProps } from '@kbn/spaces-plugin/public';
import React from 'react';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const ConfirmShareSaveModal = ({
  canSave,
  message,
  namespaces,
  spacesApi,
  title,
  onSave,
  onClone,
  onCancel,
  onClose,
}: {
  canSave: boolean;
  message: string;
  namespaces: string[];
  spacesApi?: SpacesApi;
  title: string;
  onCancel?: () => void;
  onClone: () => void;
  onClose: () => void;
  onSave: () => void;
}) => {
  const SpacesContextWrapper =
    spacesApi?.ui.components.getSpacesContextProvider ?? getEmptyFunctionComponent;

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
          {spacesApi?.ui.components.getSpaceList({
            namespaces,
            behaviorContext: 'outside-space',
            direction: 'vertical',
            displayLimit: 4,
          })}
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
                Cancel
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
                Clone
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
                  Save
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    </SpacesContextWrapper>
  );
};
