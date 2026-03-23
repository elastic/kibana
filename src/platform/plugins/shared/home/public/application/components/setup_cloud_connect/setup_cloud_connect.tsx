/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import type { ApplicationStart } from '@kbn/core/public';
import { getServices } from '../../kibana_services';

interface Props {
  addBasePath: (path: string) => string;
  application: ApplicationStart;
}

export const SetupCloudConnect: FC<Props> = ({ addBasePath, application }) => {
  const { trackUiMetric } = getServices();
  const cloudConnectUrl = application.getUrlForApp('cloud_connect');
  const handleConnectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    trackUiMetric(METRIC_TYPE.CLICK, 'home_page_open_cloud_connect');
    application.navigateToApp('cloud_connect');
  };
  const buttonLabel = (
    <FormattedMessage id="home.setupCloudConnec.buttonLabel" defaultMessage="Get started" />
  );

  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup alignItems="center" gutterSize="xl">
        <EuiFlexItem>
          <EuiImage
            alt={i18n.translate('home.setupCloudConnect.illustration.alt.text', {
              defaultMessage: 'Illustration for Cloud Connect setup',
            })}
            src={addBasePath('/plugins/kibanaReact/assets/') + 'illustration_cloud_migration.png'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage id="home.setupCloudConnect.title" defaultMessage="Cloud Connect" />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <FormattedMessage
              id="home.setupCloudConnect.description"
              defaultMessage="Use Elastic Cloud services like AutoOps and Elastic Inference Service for your self-managed clusters."
            />
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton
            fill={true}
            data-test-subj="setup_cloud_connect__button"
            color="primary"
            href={cloudConnectUrl}
            onClick={handleConnectClick}
          >
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
