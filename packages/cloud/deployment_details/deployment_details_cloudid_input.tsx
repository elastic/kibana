/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { type FC } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DeploymentDetailsCloudIdInput: FC<{ cloudId: string }> = ({ cloudId }) => {
  return (
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
  );
};
