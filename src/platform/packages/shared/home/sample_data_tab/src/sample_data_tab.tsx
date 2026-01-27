/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { DemoEnvironmentPanel } from './demo_env_panel';
import { SampleDataCards } from './sample_data_cards';

// TODO: clintandrewhall - pull from config.
import { URL_DEMO_ENV, METRIC_CLICK_DEMO_ENV_BUTTON } from './constants';
import { useServices } from './services';

/**
 * The content for the Sample Data Tab in the `home` plugin.
 */
export const SampleDataTab = () => {
  const { logClick } = useServices();
  const onClick = () => {
    logClick(METRIC_CLICK_DEMO_ENV_BUTTON);
  };

  return (
    <>
      <SampleDataCards />
      <EuiSpacer size="xl" />
      <EuiHorizontalRule />
      <EuiSpacer size="l" />
      <DemoEnvironmentPanel demoUrl={URL_DEMO_ENV} {...{ onClick }} />
    </>
  );
};
