/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { useDeploymentDetails } from './services';
import { DeploymentDetails } from './deployment_details';

interface Props {
  closeModal: () => void;
}

export const DeploymentDetailsModal: FC<Props> = ({ closeModal }) => {
  const { apiKeysLearnMoreUrl } = useDeploymentDetails();

  return (
    <EuiModal
      onClose={() => {
        closeModal();
      }}
      style={{ width: 600 }}
      data-test-subj="deploymentDetailsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('cloud.deploymentDetails.helpMenuLinks.connectionDetails', {
            defaultMessage: 'Connection details',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <DeploymentDetails closeModal={closeModal} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup alignItems="baseline" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiLink external href={apiKeysLearnMoreUrl} target="_blank">
              {i18n.translate('cloud.deploymentDetails.modal.learnMoreButtonLabel', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={closeModal} fill>
              {i18n.translate('cloud.deploymentDetails.modal.closeButtonLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
