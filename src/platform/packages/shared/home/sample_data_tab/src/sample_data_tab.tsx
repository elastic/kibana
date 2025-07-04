/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiPanel, EuiSpacer } from '@elastic/eui';

import { DemoEnvironmentPanel } from './demo_env_panel';
import { SampleDataCards } from './sample_data_cards';

// TODO: clintandrewhall - pull from config.
import {
  URL_DEMO_ENV,
  METRIC_CLICK_DEMO_ENV_BUTTON,
  METRIC_CLICK_SHOW_SAMPLE_DATA_BUTTON,
  DATA_TEST_SUBJ_SHOW_SAMPLE_DATA_BUTTON,
  DATA_TEST_SUBJ_SHOW_SAMPLE_DATA_ACCORDION,
} from './constants';
import { useServices } from './services';

const sampleDataLabel = i18n.translate('homePackages.tutorials.sampleData.sampleDataLabel', {
  defaultMessage: 'Other sample data sets',
});

/**
 * The content for the Sample Data Tab in the `home` plugin.
 */
export const SampleDataTab = () => {
  const { logClick } = useServices();
  const onClick = () => {
    logClick(METRIC_CLICK_DEMO_ENV_BUTTON);
  };

  const onToggle = (isOpen: boolean) => {
    if (isOpen) {
      logClick(METRIC_CLICK_SHOW_SAMPLE_DATA_BUTTON);
    }
  };

  return (
    <>
      <DemoEnvironmentPanel demoUrl={URL_DEMO_ENV} {...{ onClick }} />
      <EuiSpacer />
      <EuiAccordion
        id="sampleDataTab"
        buttonContent={sampleDataLabel}
        data-test-subj={DATA_TEST_SUBJ_SHOW_SAMPLE_DATA_ACCORDION}
        buttonProps={{
          'data-test-subj': DATA_TEST_SUBJ_SHOW_SAMPLE_DATA_BUTTON,
        }}
        onToggle={onToggle}
      >
        <EuiSpacer />
        <EuiPanel color="subdued" paddingSize="xl">
          <SampleDataCards />
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
