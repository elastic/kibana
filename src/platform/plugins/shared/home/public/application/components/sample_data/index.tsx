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
import type { UseEuiTheme } from '@elastic/eui';
import { EuiCard, EuiButton, EuiButtonEmpty, EuiIllustration, EuiPanel } from '@elastic/eui';
import { monitorGraphCogs } from '@elastic/eui-illustrations';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  urlBasePath: string;
  onDecline: () => void;
  onConfirm: () => void;
}

export function SampleDataCard({ onDecline, onConfirm }: Props) {
  return (
    <EuiCard
      image={
        <EuiPanel paddingSize="m" color="transparent" hasShadow={false} hasBorder={false}>
          <EuiIllustration
            type={monitorGraphCogs}
            fullWidth={false}
            alt={i18n.translate('home.letsStartIllustrationAriaLabel', {
              defaultMessage: 'Welcome to Elastic. Add integrations, or explore on your own.',
            })}
            style={{
              display: 'block',
              inlineSize: 200,
              blockSize: 'auto',
              marginInline: 'auto',
            }}
          />
        </EuiPanel>
      }
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
