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
  EuiIllustration,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { api } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import type { ApplicationStart } from '@kbn/core/public';
import { hasActiveModifierKey } from '@kbn/shared-ux-utility';
import { getServices } from '../../kibana_services';

interface Props {
  application: ApplicationStart;
}

export const SetupCloudConnect: FC<Props> = ({ application }) => {
  const { trackUiMetric } = getServices();
  const cloudConnectUrl = application.getUrlForApp('cloud_connect');
  const handleConnectClick = (e: React.MouseEvent) => {
    if (hasActiveModifierKey(e)) return;
    e.preventDefault();
    trackUiMetric(METRIC_TYPE.CLICK, 'home_page_open_cloud_connect');
    application.navigateToApp('cloud_connect');
  };
  const buttonLabel = (
    <FormattedMessage id="home.setupCloudConnec.buttonLabel" defaultMessage="Get started" />
  );

  return (
    <EuiPanel paddingSize="l" css={cardPanel}>
      <EuiFlexGroup alignItems="center" gutterSize="xl" responsive={false} css={cardRow}>
        <EuiFlexItem grow={false} css={illustrationFrame}>
          <EuiIllustration
            type={api}
            alt={i18n.translate('home.setupCloudConnect.illustration.alt.text', {
              defaultMessage: 'Illustration for Cloud Connect setup',
            })}
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

const cardPanel = css({
  containerType: 'inline-size',
});

// Stack only when the card cannot fit the 128px illustration beside the text.
const cardRow = css({
  '@container (max-width: 20rem)': {
    flexDirection: 'column',
    alignItems: 'flex-start',
    '& > .euiFlexItem:last-child': {
      alignSelf: 'stretch',
    },
  },
});

const illustrationFrame = css({
  inlineSize: 128,
});
