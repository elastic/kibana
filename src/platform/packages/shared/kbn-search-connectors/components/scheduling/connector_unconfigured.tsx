/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer, EuiText, EuiButton, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface ConnectorUnconfiguredProps {
  configurationPathOnClick?: () => void;
  dataTelemetryIdPrefix: string;
}
export const ConnectorUnconfigured: React.FC<ConnectorUnconfiguredProps> = ({
  configurationPathOnClick,
  dataTelemetryIdPrefix,
}) => {
  return (
    <>
      <EuiSpacer />
      <EuiCallOut
        iconType="iInCircle"
        title={i18n.translate(
          'searchConnectors.content.indices.connectorScheduling.notConnected.title',
          {
            defaultMessage: 'Configure your connector to schedule a sync',
          }
        )}
      >
        <EuiText size="s">
          {i18n.translate(
            'searchConnectors.content.indices.connectorScheduling.notConnected.description',
            {
              defaultMessage:
                'Configure and deploy your connector, then return here to set your sync schedule. This schedule will dictate the interval that the connector will sync with your data source for updated documents.',
            }
          )}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButton
          data-telemetry-id={`${dataTelemetryIdPrefix}-connector-scheduling-configure`}
          onClick={configurationPathOnClick}
          fill
          size="s"
        >
          {i18n.translate(
            'searchConnectors.content.indices.connectorScheduling.notConnected.button.label',
            {
              defaultMessage: 'Configure',
            }
          )}
        </EuiButton>
      </EuiCallOut>
    </>
  );
};
