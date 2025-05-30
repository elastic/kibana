/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * The UI and related logic for the welcome screen that *should* show only
 * when it is enabled (the default) and there is no Kibana-consumed data
 * in Elasticsearch.
 */

import React from 'react';
import { EuiCard, EuiButton, EuiButtonEmpty, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

interface Props {
  urlBasePath: string;
  onDecline: () => void;
  onConfirm: () => void;
}

export function SampleDataCard({ urlBasePath, onDecline, onConfirm }: Props) {
  const isDarkMode = useKibanaIsDarkMode();

  const cardGraphicFile = !isDarkMode
    ? 'illustration_integrations_lightmode.png'
    : 'illustration_integrations_darkmode.png';
  const cardGraphicURL = `${urlBasePath}/plugins/home/assets/common/${cardGraphicFile}`;

  return (
    <EuiCard
      image={cardGraphicURL}
      textAlign="left"
      title={
        <FormattedMessage id="home.letsStartTitle" defaultMessage="Start by adding integrations" />
      }
      description={
        <FormattedMessage
          id="home.letsStartDescription"
          defaultMessage="Add data to your cluster from any source, then analyze and visualize it in real time. Use our solutions to add search anywhere, observe your ecosystem, and defend against security threats."
        />
      }
      footer={
        <footer>
          <EuiButton fill css={footerAction} onClick={onConfirm}>
            <FormattedMessage id="home.tryButtonLabel" defaultMessage="Add integrations" />
          </EuiButton>
          <EuiButtonEmpty css={footerAction} onClick={onDecline} data-test-subj="skipWelcomeScreen">
            <FormattedMessage id="home.exploreButtonLabel" defaultMessage="Explore on my own" />
          </EuiButtonEmpty>
        </footer>
      }
    />
  );
}
const footerAction = ({ euiTheme }: UseEuiTheme) => {
  return css({
    marginRight: euiTheme.size.s,
  });
};
