/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DATA_TEST_SUBJ_DEMO_ENV_BUTTON, METRIC_CLICK_DEMO_ENV_BUTTON } from './constants';
import { useServices } from './services';

const title = i18n.translate('homePackages.demoEnvironmentPanel.welcomeTitle', {
  defaultMessage: 'Explore our live demo environment',
});

const message = i18n.translate('homePackages.demoEnvironmentPanel.welcomeMessage', {
  defaultMessage:
    'Browse real-world data in a demo environment where you can explore search, observability, and security use cases like yours.',
});

const linkLabel = i18n.translate('homePackages.demoEnvironmentPanel.linkLabel', {
  defaultMessage: 'View demo environment',
});

export interface Props {
  demoUrl: string;
}

export const DemoEnvironmentPanel = ({ demoUrl }: Props) => {
  const { logClick } = useServices();
  const onClick = () => {
    logClick(METRIC_CLICK_DEMO_ENV_BUTTON);
  };

  return (
    <>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>{message}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiLink
        href={demoUrl}
        target="_blank"
        external
        onClick={onClick}
        data-test-subj={DATA_TEST_SUBJ_DEMO_ENV_BUTTON}
      >
        {linkLabel}
      </EuiLink>
    </>
  );
};
