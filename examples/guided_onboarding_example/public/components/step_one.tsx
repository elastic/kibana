/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiText,
  EuiTourStep,
  EuiTitle,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiCode,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public/types';

interface GuidedOnboardingExampleAppDeps {
  guidedOnboarding?: GuidedOnboardingPluginStart;
}

export const StepOne = ({ guidedOnboarding }: GuidedOnboardingExampleAppDeps) => {
  const [isTourStepOpen, setIsTourStepOpen] = useState<boolean>(false);
  const [indexName, setIndexName] = useState('test1234');

  useEffect(() => {
    const subscription = guidedOnboarding?.guidedOnboardingApi
      ?.isGuideStepActive$('testGuide', 'step1')
      .subscribe((isStepActive) => {
        setIsTourStepOpen(isStepActive);
      });
    return () => subscription?.unsubscribe();
  }, [guidedOnboarding]);

  return (
    <>
      <EuiPageHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="guidedOnboardingExample.stepOne.title"
              defaultMessage="Example step 1"
            />
          </h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>
        <EuiText>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepOne.explanation"
              defaultMessage="The code on this page is listening to the guided setup state with a useObservable hook. If the state is set to
              Test guide, step 1, a EUI tour will be displayed, pointing to the button below."
            />
          </p>
          <p>
            <FormattedMessage
              id="guidedOnboardingExample.guidesSelection.stepOne.dynamicParamsExplanation"
              defaultMessage="There is also an input field to provide a dynamic parameter {indexName} for step 4."
              values={{
                indexName: <EuiCode language="javascript">indexName</EuiCode>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="guidedOnboardingExample.guidesSelection.stepOne.indexNameInputLabel"
                  defaultMessage="indexName"
                />
              }
            >
              <EuiFieldText value={indexName} onChange={(e) => setIndexName(e.target.value)} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow hasEmptyLabelSpace>
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
                title="Step 1"
                anchorPosition="rightUp"
              >
                <EuiButton
                  onClick={async () => {
                    await guidedOnboarding?.guidedOnboardingApi?.completeGuideStep(
                      'testGuide',
                      'step1',
                      {
                        indexName,
                      }
                    );
                  }}
                >
                  Complete step 1
                </EuiButton>
              </EuiTourStep>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </>
  );
};
