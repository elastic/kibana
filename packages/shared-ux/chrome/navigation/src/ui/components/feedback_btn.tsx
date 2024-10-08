/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiCallOut, useEuiTheme, EuiText, EuiSpacer } from '@elastic/eui';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

const feedbackUrl = 'https://ela.st/nav-feedback';

export const FeedbackBtn: FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCallOut
      color="warning"
      css={{
        margin: `0 ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}`,
      }}
    >
      <EuiText size="s" color="dimgrey">
        {i18n.translate('sharedUXPackages.chrome.sideNavigation.feedbackCallout.title', {
          defaultMessage: `How's the new navigation working for you? Missing anything?`,
        })}
      </EuiText>
      <EuiSpacer />
      <EuiButton
        href={feedbackUrl}
        target="_blank"
        color="warning"
        fill
        iconType="popout"
        iconSide="right"
        size="s"
        fullWidth
      >
        {i18n.translate('sharedUXPackages.chrome.sideNavigation.feedbackCallout.btn', {
          defaultMessage: 'Let us know',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};
