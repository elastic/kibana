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
import { useHistory, useLocation } from 'react-router-dom';
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
  const { search } = useLocation();
  const history = useHistory();

  const query = React.useMemo(() => new URLSearchParams(search), [search]);
  useEffect(() => {
    if (query.get('showTour') === 'true') {
      setIsTourStepOpen(true);
    }
  }, [query]);

  const [isTourStepOpen, setIsTourStepOpen] = useState<boolean>(false);

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
              id="guidedOnboardingExample.guidesSelection.stepTwo.explanation"
              defaultMessage="The EUI tour on this page is displayed, when a url param 'showTour' is set to 'true'."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiTourStep
          content={
            <EuiText>
              <p>Click this button to complete step 2.</p>
            </EuiText>
          }
          isStepOpen={isTourStepOpen}
          minWidth={300}
          onFinish={() => {
            history.push('/stepTwo');
            query.set('showTour', 'false');
            setIsTourStepOpen(false);
          }}
          step={1}
          stepsTotal={1}
          title="Step Add data"
          anchorPosition="rightUp"
        >
          <EuiButton
            onClick={async () => {
              await guidedOnboardingApi?.updateGuideState({
                activeGuide: 'search',
                activeStep: 'optimize',
              });
            }}
          >
            Complete step 2
          </EuiButton>
        </EuiTourStep>
      </EuiPageContentBody>
    </>
  );
};
