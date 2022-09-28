/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import { EuiButton, EuiSpacer, EuiText, EuiTitle, EuiTourStep } from '@elastic/eui';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
} from '@elastic/eui';

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
      ?.isGuideStepActive$('search', 'search_experience')
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
              id="guidedOnboardingExample.stepThree.title"
              defaultMessage="Example step 3"
            />
          </h2>
        </EuiTitle>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepThree.explanation"
              defaultMessage="The EUI tour on this page is displayed, when a url param 'showTour' is set to 'true'."
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
          title="Step Build search experience"
          anchorPosition="rightUp"
        >
          <EuiButton
            onClick={async () => {
              await guidedOnboardingApi?.completeGuideStep('search', 'search_experience');
            }}
          >
            Complete step 3
          </EuiButton>
        </EuiTourStep>
      </EuiPageContentBody>
    </>
  );
};
