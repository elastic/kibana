/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type FC } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiCopy,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  EuiPopover,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

const LearnMoreLink: FC<{ learnMoreUrl: string }> = ({ learnMoreUrl }) => (
  <EuiLink href={learnMoreUrl}>
    {i18n.translate('cloud.deploymentDetails.cloudIDLabelToolip.learnMoreLink', {
      defaultMessage: 'Learn more',
    })}
  </EuiLink>
);

const Label: FC<{ learnMoreUrl: string }> = ({ learnMoreUrl }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiFlexGroup css={{ minWidth: 200, height: 16 }} alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" css={{ fontWeight: 600 }}>
          {i18n.translate('cloud.deploymentDetails.cloudIDLabel', {
            defaultMessage: 'Cloud ID',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="questionInCircle"
              onClick={() => {
                setIsPopoverOpen(true);
              }}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => {
            setIsPopoverOpen(false);
          }}
          anchorPosition="upCenter"
        >
          <p style={{ width: 270 }}>
            <FormattedMessage
              id="cloud.deploymentDetails.cloudIDLabelToolip"
              defaultMessage="Get started with Elastic Agent or Logstash quickly. The Cloud ID simplifies sending data to Elastic. {link}"
              values={{ link: <LearnMoreLink learnMoreUrl={learnMoreUrl} /> }}
            />
          </p>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const DeploymentDetailsCloudIdInput: FC<{ cloudId: string; learnMoreUrl: string }> = ({
  cloudId,
  learnMoreUrl,
}) => {
  return (
    <EuiFormRow label={<Label learnMoreUrl={learnMoreUrl} />} fullWidth>
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
