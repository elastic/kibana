/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CopyInput } from '../../../components/copy_input';
import { useConnectionDetailsService } from '../../../context';
import { useBehaviorSubject } from '../../../hooks/use_behavior_subject';

const Label: React.FC<{ learnMoreUrl?: string }> = ({ learnMoreUrl }) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const labelText = i18n.translate('cloud.connectionDetails.tab.endpoints.cloudIdField.label', {
    defaultMessage: 'Cloud ID',
  });

  if (!learnMoreUrl) {
    return <>{labelText}</>;
  }

  return (
    <EuiFlexGroup css={{ minWidth: 200, height: 16 }} alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" css={{ fontWeight: 600 }}>
          {labelText}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="questionInCircle"
              onClick={() => {
                setIsPopoverOpen((x) => !x);
              }}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => {
            setIsPopoverOpen(false);
          }}
          anchorPosition="upLeft"
          hasArrow={false}
        >
          <p style={{ width: 270 }}>
            <FormattedMessage
              id="cloud.connectionDetails.tab.endpoints.cloudIdField.label.tooltip"
              defaultMessage="Get started with Elastic Agent or Logstash quickly. The Cloud ID simplifies sending data to Elastic. {link}"
              values={{
                link: (
                  <EuiLink href={learnMoreUrl}>
                    {i18n.translate(
                      'cloud.connectionDetails.tab.endpoints.cloudIdField.learnMore',
                      {
                        defaultMessage: 'Learn more',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export interface CloudIdRowProps {
  value: string;
}

export const CloudIdRow: React.FC<CloudIdRowProps> = ({ value }) => {
  const service = useConnectionDetailsService();
  const showCloudId = useBehaviorSubject(service.showCloudId$);

  return (
    <>
      <EuiSpacer size="l" />

      <EuiSwitch
        label={i18n.translate('cloud.connectionDetails.tab.endpoints.cloudIdField.toggle', {
          defaultMessage: 'Show Cloud ID',
        })}
        checked={showCloudId}
        onChange={service.toggleShowCloudId}
        data-test-subj="connectionDetailsCloudIdSwitch"
      />

      {showCloudId && <EuiSpacer size="l" />}

      {showCloudId && (
        <EuiFormRow
          label={<Label learnMoreUrl={service.opts.endpoints?.cloudIdLearMoreLink} />}
          helpText={i18n.translate('cloud.connectionDetails.tab.endpoints.cloudIdField.helpText', {
            defaultMessage:
              'Specific client libraries and connectors can use this unique identifier specific to Elastic Cloud.',
          })}
          fullWidth
          data-test-subj="connectionDetailsCloudId"
        >
          <CopyInput value={value} />
        </EuiFormRow>
      )}
    </>
  );
};
