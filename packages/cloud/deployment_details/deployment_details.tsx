/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';

import {
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDeploymentDetails } from './services';
import { DeploymentDetailsEsInput } from './deployment_details_es_input';
import { DeploymentDetailsCloudIdInput } from './deployment_details_cloudid_input';

const hasActiveModifierKey = (event: React.MouseEvent): boolean => {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
};

export const DeploymentDetails = ({ closeModal }: { closeModal?: () => void }) => {
  const {
    cloudId,
    elasticsearchUrl,
    managementUrl,
    apiKeysLearnMoreUrl,
    cloudIdLearnMoreUrl,
    navigateToUrl,
  } = useDeploymentDetails();
  const isInsideModal = !!closeModal;

  if (!cloudId) {
    return null;
  }

  return (
    <EuiForm component="div">
      {/* Elastic endpoint */}
      {elasticsearchUrl && <DeploymentDetailsEsInput elasticsearchUrl={elasticsearchUrl} />}

      {/* Cloud ID */}
      <DeploymentDetailsCloudIdInput cloudId={cloudId} learnMoreUrl={cloudIdLearnMoreUrl} />

      <EuiSpacer size="m" />

      {managementUrl && (
        <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButtonEmpty
              href={managementUrl}
              onClick={(e: React.MouseEvent) => {
                if (!hasActiveModifierKey(e)) {
                  e.preventDefault();
                  navigateToUrl(managementUrl);
                }
                if (closeModal) {
                  closeModal();
                }
              }}
              flush="left"
            >
              {i18n.translate('cloud.deploymentDetails.createManageApiKeysButtonLabel', {
                defaultMessage: 'Create and manage API keys',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!isInsideModal && (
            <EuiFlexItem grow={false}>
              <EuiLink external href={apiKeysLearnMoreUrl} target="_blank">
                {i18n.translate('cloud.deploymentDetails.learnMoreButtonLabel', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiForm>
  );
};
