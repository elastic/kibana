/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiSpacer, EuiText, EuiTitle, EuiTourStep } from '@elastic/eui';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
} from '@elastic/eui';

interface StepTwoProps {
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export const StepTwo = (props: StepTwoProps) => {
  const {
    guidedOnboarding: { guidedOnboardingApi },
  } = props;

  const [isTourStepOpen, setIsTourStepOpen] = useState<boolean>(false);

  useEffect(() => {
    const subscription = guidedOnboardingApi
      ?.isGuideStepActive$('testGuide', 'step2')
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
              id="guidedOnboardingExample.stepTwo.title"
              defaultMessage="Example step 2"
            />
          </h2>
        </EuiTitle>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepTwo.explanation1"
              defaultMessage="The code on this page is listening to the guided setup state using an Observable subscription. If the state is set to
              Search guide, step Browse documents, a EUI tour will be displayed."
            />
          </p>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepTwo.explanation2"
              defaultMessage="This page is used for the manual completion of Test guide, step 2. The manual completion popover
              should appear on the header button 'Setup guide' to open the panel and mark the step done."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiTourStep
          content={
            <EuiText>
              <p>The tour step is displayed when Test guide, step 2 is active.</p>
            </EuiText>
          }
          isStepOpen={isTourStepOpen}
          minWidth={300}
          onFinish={() => {
            setIsTourStepOpen(false);
          }}
          step={1}
          stepsTotal={1}
          title="Step 2"
          anchorPosition="rightUp"
        >
          <EuiText>Test guide, step 2</EuiText>
        </EuiTourStep>
      </EuiPageContentBody>
    </>
  );
};
