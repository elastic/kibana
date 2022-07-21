/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiPanel, EuiSpacer } from '@elastic/eui';

import { DemoEnvironmentPanel } from './demo_env_panel';
import { SampleDataCards } from './sample_data_cards';

const sampleDataLabel = i18n.translate('homePackages.tutorials.sampleData.sampleDataLabel', {
  defaultMessage: 'Other sample data sets',
});

export const SampleDataTabContent = () => {
  return (
    <>
      <DemoEnvironmentPanel demoUrl="#" />
      <EuiSpacer />
      <EuiAccordion
        id="sampleDataTab"
        buttonContent={sampleDataLabel}
        data-test-subj="sampleDataAccordion"
        buttonProps={{
          'data-test-subj': 'sampleDataAccordionButton',
        }}
      >
        <EuiSpacer />
        <EuiPanel color="subdued" paddingSize="xl">
          <SampleDataCards />
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
