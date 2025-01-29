/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiText, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageHeader, EuiPageSection } from '@elastic/eui';

export const StepTwo = () => {
  return (
    <>
      <EuiPageHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.stepTwo.title"
              defaultMessage="Example step 2"
            />
          </h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepTwo.explanation"
              defaultMessage="This page is used for the manual completion of Test guide, step 2. The manual completion popover
              should appear on the header button 'Setup guide' to open the panel and mark the step done."
            />
          </p>
        </EuiText>
      </EuiPageSection>
    </>
  );
};
