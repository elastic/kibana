/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiCallOut, useEuiTheme, EuiText, EuiSpacer } from '@elastic/eui';
import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { SolutionId } from '@kbn/core-chrome-browser';

const feedbackUrls: { [id in SolutionId]: string } = {
  es: 'https://ela.st/search-nav-feedback',
  oblt: 'https://ela.st/o11y-nav-feedback',
  security: 'https://ela.st/security-nav-feedback',
};
const FEEDBACK_BTN_KEY = 'core.chrome.sideNav.feedbackBtn';

interface Props {
  solutionId: SolutionId;
}

export const FeedbackBtn: FC<Props> = ({ solutionId }) => {
  const { euiTheme } = useEuiTheme();
  const [showCallOut, setShowCallOut] = useState(
    sessionStorage.getItem(FEEDBACK_BTN_KEY) !== 'hidden'
  );

  const onDismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem(FEEDBACK_BTN_KEY, 'hidden');
  };

  const onClick = () => {
    window.open(feedbackUrls[solutionId], '_blank');
    onDismiss();
  };

  if (!showCallOut) return null;

  return (
    <EuiCallOut
      color="warning"
      css={{
        margin: `0 ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m}`,
      }}
      onDismiss={onDismiss}
      data-test-subj="sideNavfeedbackCallout"
    >
      <EuiText size="s" color="dimgrey">
        {i18n.translate('sharedUXPackages.chrome.sideNavigation.feedbackCallout.title', {
          defaultMessage: `How's the navigation working for you? Missing anything?`,
        })}
      </EuiText>
      <EuiSpacer />
      <EuiButton
        onClick={onClick}
        color="warning"
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
