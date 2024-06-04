/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CopyInput } from '../../../../components/copy_input';
import { Label } from './label';

export interface CloudIdRowProps {
  value: string;
  showCloudId: boolean;
  learnMoreUrl?: string;
  onShowCloudIdToggle: () => void;
  onCopyClick?: () => void;
}

export const CloudIdRow: React.FC<CloudIdRowProps> = ({
  value,
  showCloudId,
  learnMoreUrl,
  onShowCloudIdToggle,
  onCopyClick,
}) => {
  return (
    <>
      <EuiSpacer size="l" />

      <EuiSwitch
        label={i18n.translate('cloud.connectionDetails.tab.endpoints.cloudIdField.toggle', {
          defaultMessage: 'Show Cloud ID',
        })}
        checked={showCloudId}
        onChange={() => onShowCloudIdToggle()}
        data-test-subj="connectionDetailsCloudIdSwitch"
      />

      {showCloudId && <EuiSpacer size="l" />}

      {showCloudId && (
        <EuiFormRow
          label={
            <Label
              learnMoreUrl={learnMoreUrl}
              aria-label={i18n.translate('cloud.connectionDetails.cloudId.learnMore', {
                defaultMessage: 'Learn more about Cloud ID',
              })}
            />
          }
          helpText={i18n.translate('cloud.connectionDetails.tab.endpoints.cloudIdField.helpText', {
            defaultMessage:
              'Specific client libraries and connectors can use this unique identifier specific to Elastic Cloud.',
          })}
          fullWidth
          data-test-subj="connectionDetailsCloudId"
        >
          <CopyInput
            value={value}
            onCopyClick={() => onCopyClick?.()}
            aria-label={i18n.translate('cloud.connectionDetails.tab.cloudId.label', {
              defaultMessage: 'Copy Cloud ID to clipboard',
            })}
          />
        </EuiFormRow>
      )}
    </>
  );
};
