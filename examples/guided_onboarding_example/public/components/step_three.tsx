/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import { EuiButton, EuiSpacer, EuiText, EuiTitle, EuiTourStep } from '@elastic/eui';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageHeader, EuiPageSection } from '@elastic/eui';

interface StepThreeProps {
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export const StepThree = (props: StepThreeProps) => {
  const {
    guidedOnboarding: { guidedOnboardingApi },
  } = props;

  const [isTourStepOpen, setIsTourStepOpen] = useState<boolean>(false);

  useEffect(() => {
    const subscription = guidedOnboardingApi
      ?.isGuideStepActive$('testGuide', 'step3')
      .subscribe((isStepActive) => {
        setIsTourStepOpen(isStepActive);
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboardingApi]);

  return (
    <>
      <EuiPageHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.stepThree.title"
              defaultMessage="Example step 3"
            />
          </h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepThree.explanation1"
              defaultMessage="The code on this page is listening to the guided setup state using an Observable subscription.
              If the state is set to Test, step 3, a EUI tour will be displayed, pointing to the button below."
            />
          </p>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepTwo.explanation2"
              defaultMessage="This page is used for the manual completion of Test guide, step 3. After clicking the page,
              the manual completion popover
              should appear on the header button 'Setup guide' to open the panel and mark the step done."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiTourStep
          content={
            <EuiText>
              <p>Click this button to complete step 3.</p>
            </EuiText>
          }
          isStepOpen={isTourStepOpen}
          minWidth={300}
          onFinish={() => {
            setIsTourStepOpen(false);
          }}
          step={1}
          stepsTotal={1}
          title="Step 3"
          anchorPosition="rightUp"
        >
          <EuiButton
            onClick={async () => {
              await guidedOnboardingApi?.completeGuideStep('testGuide', 'step3');
            }}
          >
            Complete step 3
          </EuiButton>
        </EuiTourStep>
      </EuiPageSection>
    </>
  );
};
