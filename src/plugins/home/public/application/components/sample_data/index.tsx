/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * The UI and related logic for the welcome screen that *should* show only
 * when it is enabled (the default) and there is no Kibana-consumed data
 * in Elasticsearch.
 */

import React from 'react';
import {
  // @ts-ignore
  EuiCard,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getServices } from '../../kibana_services';

interface Props {
  urlBasePath: string;
  onDecline: () => void;
  onConfirm: () => void;
}

export function SampleDataCard({ urlBasePath, onDecline, onConfirm }: Props) {
  const IS_DARK_THEME = getServices().uiSettings.get('theme:darkMode');
  const cardGraphicFile = !IS_DARK_THEME
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
          defaultMessage="Add data to your cluster from any source, then analyze and visualize it in real time. Use our solutions to add search anywhere, observe your ecosystem, and protect against security threats."
        />
      }
      footer={
        <footer>
          <EuiButton fill className="homWelcome__footerAction" onClick={onConfirm}>
            <FormattedMessage id="home.tryButtonLabel" defaultMessage="Add integrations" />
          </EuiButton>
          <EuiButtonEmpty
            className="homWelcome__footerAction"
            onClick={onDecline}
            data-test-subj="skipWelcomeScreen"
          >
            <FormattedMessage id="home.exploreButtonLabel" defaultMessage="Explore on my own" />
          </EuiButtonEmpty>
        </footer>
      }
    />
  );
}
