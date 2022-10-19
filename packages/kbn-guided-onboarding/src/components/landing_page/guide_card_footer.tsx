/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiProgress, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GuideId, GuideState } from '../../types';
import { UseCase } from './use_case_card';

export const GuideCardFooter = ({
  guides,
  useCase,
  activateGuide,
}: {
  guides: GuideState[];
  useCase: UseCase;
  activateGuide: (useCase: UseCase, guideState?: GuideState) => void;
}) => {
  const guideState = guides.find((guide) => guide.guideId === (useCase as GuideId));
  const viewGuideButton = (
    <div className="eui-textCenter">
      <EuiButton
        // Used for FS tracking
        data-test-subj={`onboarding--guideCard--view--${useCase}`}
        fill
        onClick={() => activateGuide(useCase, guideState)}
      >
        {i18n.translate('guidedOnboardingPackage.gettingStarted.guideCard.startGuide.buttonLabel', {
          defaultMessage: 'View guide',
        })}
      </EuiButton>
    </div>
  );
  // guide has not started yet
  if (!guideState || guideState.status === 'not_started') {
    return viewGuideButton;
  }
  const { status, steps } = guideState;
  const numberSteps = steps.length;
  const numberCompleteSteps = steps.filter((step) => step.status === 'complete').length;
  const stepsLabel = i18n.translate('guidedOnboardingPackage.gettingStarted.guideCard.stepsLabel', {
    defaultMessage: '{progress} steps',
    values: {
      progress: `${numberCompleteSteps}/${numberSteps}`,
    },
  });
  // guide is completed
  if (status === 'complete') {
    return (
      <>
        <EuiProgress
          valueText={stepsLabel}
          value={numberCompleteSteps}
          max={numberSteps}
          size="s"
          label={i18n.translate(
            'guidedOnboardingPackage.gettingStarted.guideCard.progress.completedLabel',
            {
              defaultMessage: 'Completed',
            }
          )}
        />
        <EuiSpacer size="l" />
        <div className="eui-textCenter">
          <EuiButton
            // Used for FS tracking
            data-test-subj={`onboarding--guideCard--view--${useCase}`}
            fill
            onClick={() => activateGuide(useCase, guideState)}
          >
            {i18n.translate(
              'guidedOnboardingPackage.gettingStarted.guideCard.startGuide.buttonLabel',
              {
                defaultMessage: 'View guide',
              }
            )}
          </EuiButton>
        </div>
      </>
    );
  }
  // guide is in progress or ready to complete
  return (
    <>
      <EuiProgress
        valueText={stepsLabel}
        value={numberCompleteSteps}
        max={numberSteps}
        size="s"
        label={i18n.translate(
          'guidedOnboardingPackage.gettingStarted.guideCard.progress.inProgressLabel',
          {
            defaultMessage: 'In progress',
          }
        )}
      />
      <EuiSpacer size="l" />
      <div className="eui-textCenter">
        <EuiButton
          // Used for FS tracking
          data-test-subj={`onboarding--guideCard--continue--${useCase}`}
          fill
          onClick={() => activateGuide(useCase, guideState)}
        >
          {i18n.translate(
            'guidedOnboardingPackage.gettingStarted.guideCard.continueGuide.buttonLabel',
            {
              defaultMessage: 'Continue',
            }
          )}
        </EuiButton>
      </div>
    </>
  );
};
