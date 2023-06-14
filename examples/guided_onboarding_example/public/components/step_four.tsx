/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiButton, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiCode,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';

interface StepFourProps {
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export const StepFour = (props: StepFourProps & RouteComponentProps<{ indexName: string }>) => {
  const {
    guidedOnboarding: { guidedOnboardingApi },
    match: {
      params: { indexName },
    },
  } = props;

  const [, setIsTourStepOpen] = useState<boolean>(false);

  useEffect(() => {
    const subscription = guidedOnboardingApi
      ?.isGuideStepActive$('testGuide', 'step4')
      .subscribe((isStepActive) => {
        setIsTourStepOpen(isStepActive);
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboardingApi]);

  return (
    <>
      <EuiPageContentHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.stepFour.title"
              defaultMessage="Example step 4"
            />
          </h2>
        </EuiTitle>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepFour.explanation"
              defaultMessage="This step has a dynamic URL with a param {indexName} passed in step 1"
              values={{
                indexName: (
                  <EuiCode language="javascript">&#123;indexName: {indexName}&#125;</EuiCode>
                ),
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />

        <EuiButton
          onClick={async () => {
            await guidedOnboardingApi?.completeGuideStep('testGuide', 'step4');
          }}
        >
          Complete step 4
        </EuiButton>
      </EuiPageContentBody>
    </>
  );
};
