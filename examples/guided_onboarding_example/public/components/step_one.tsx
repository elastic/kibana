/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiText,
  EuiTourStep,
  EuiTitle,
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiSpacer,
} from '@elastic/eui';

import useObservable from 'react-use/lib/useObservable';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';

interface GuidedOnboardingExampleAppDeps {
  guidedOnboarding: GuidedOnboardingPluginStart;
}

export const StepOne = ({ guidedOnboarding }: GuidedOnboardingExampleAppDeps) => {
  const { guidedOnboardingApi } = guidedOnboarding;

  const [isTourStepOpen, setIsTourStepOpen] = useState<boolean>(false);

  const isTourActive = useObservable(
    guidedOnboardingApi!.isGuideStepActive$('search', 'add_data'),
    false
  );
  useEffect(() => {
    setIsTourStepOpen(isTourActive);
  }, [isTourActive]);
  return (
    <>
      <EuiPageContentHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.stepOne.title"
              defaultMessage="Example step Add data"
            />
          </h2>
        </EuiTitle>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepOne.explanation"
              defaultMessage="The code on this page is listening to the guided setup state. If the state is set to
              Search guide, step Add data, a EUI tour will be displayed, pointing to the button below. Alternatively,
              the tour can be displayed via a localStorage value or a url param (see step 2)."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiTourStep
          content={
            <EuiText>
              <p>Click this button to complete step 1.</p>
            </EuiText>
          }
          isStepOpen={isTourStepOpen}
          minWidth={300}
          onFinish={() => setIsTourStepOpen(false)}
          step={1}
          stepsTotal={1}
          title="Step Add data"
          anchorPosition="rightUp"
        >
          <EuiButton
            onClick={async () => {
              await guidedOnboardingApi?.completeGuideStep('search', 'add_data');
            }}
          >
            Complete step 1
          </EuiButton>
        </EuiTourStep>
      </EuiPageContentBody>
    </>
  );
};
