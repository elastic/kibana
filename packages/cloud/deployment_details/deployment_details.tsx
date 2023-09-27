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
  EuiFormRow,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDeploymentDetails } from './services';

const hasActiveModifierKey = (event: React.MouseEvent): boolean => {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
};

export const DeploymentDetails = ({ closeModal }: { closeModal?: () => void }) => {
  const { cloudId, elasticsearchUrl, managementUrl, learnMoreUrl, navigateToUrl } =
    useDeploymentDetails();
  const isInsideModal = !!closeModal;

  if (!cloudId) {
    return null;
  }

  return (
    <>
      <EuiForm component="div">
        {/* Elastic endpoint */}
        {elasticsearchUrl && (
          <EuiFormRow
            label={i18n.translate('cloud.deploymentDetails.elasticEndpointLabel', {
              defaultMessage: 'Elastic endpoint',
            })}
            fullWidth
          >
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldText
                  value={elasticsearchUrl}
                  fullWidth
                  disabled
                  data-test-subj="deploymentDetailsEsEndpoint"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={elasticsearchUrl}>
                  {(copy) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      display="base"
                      size="m"
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        )}

        {/* Cloud ID */}
        <EuiFormRow
          label={i18n.translate('cloud.deploymentDetails.cloudIDLabel', {
            defaultMessage: 'Cloud ID',
          })}
          fullWidth
        >
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFieldText
                value={cloudId}
                fullWidth
                disabled
                data-test-subj="deploymentDetailsCloudID"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={cloudId}>
                {(copy) => (
                  <EuiButtonIcon onClick={copy} iconType="copyClipboard" display="base" size="m" />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

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
                <EuiLink external href={learnMoreUrl} target="_blank">
                  {i18n.translate('cloud.deploymentDetails.learnMoreButtonLabel', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
      </EuiForm>
    </>
  );
};
