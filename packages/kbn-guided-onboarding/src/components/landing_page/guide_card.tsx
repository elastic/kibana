/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiProgress, EuiSpacer } from '@elastic/eui';

import type { HttpStart } from '@kbn/core-http-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { UseCase, UseCaseCard } from './use_case_card';
import { GuideId, GuideState } from '../../types';

type GuideCardConstants = {
  [key in UseCase]: {
    i18nTexts: {
      title: string;
      description: string;
    };
  };
};
const constants: GuideCardConstants = {
  search: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.guideCard.search.cardTitle', {
        defaultMessage: 'Search my data',
      }),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.search.cardDescription',
        {
          defaultMessage:
            'Create a finely-tuned search experience for your websites, applications, workplace content, and more.',
        }
      ),
    },
  },
  observability: {
    i18nTexts: {
      title: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.observability.cardTitle',
        {
          defaultMessage: 'Monitor my environments',
        }
      ),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.observability.cardDescription',
        {
          defaultMessage:
            'Get end-to-end observability into your environments by consolidating your logs, metrics, and traces.',
        }
      ),
    },
  },
  security: {
    i18nTexts: {
      title: i18n.translate('home.guidedOnboarding.gettingStarted.guideCard.security.cardTitle', {
        defaultMessage: 'Protect my environment',
      }),
      description: i18n.translate(
        'home.guidedOnboarding.gettingStarted.guideCard.security.cardDescription',
        {
          defaultMessage:
            'Protect your environment against threats by unifying SIEM, endpoint security, and cloud security in one place.',
        }
      ),
    },
  },
};

const getCardFooter = (
  guides: GuideState[],
  useCase: UseCase,
  activateGuide: (useCase: UseCase, guideState?: GuideState) => void
): ReactNode => {
  const guideState = guides.find((guide) => guide.guideId === (useCase as GuideId));
  const viewGuideButton = (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          // Used for FS tracking
          data-test-subj={`onboarding--guideCard--view--${useCase}`}
          fill
          onClick={() => activateGuide(useCase, guideState)}
        >
          {i18n.translate('home.guidedOnboarding.gettingStarted.guideCard.startGuide.buttonLabel', {
            defaultMessage: 'View guide',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
  // guide has not started yet
  if (!guideState || guideState.status === 'not_started') {
    return viewGuideButton;
  }
  const numberSteps = guideState.steps.length;
  const numberCompleteSteps = guideState.steps.filter((step) => step.status === 'complete').length;
  const stepsLabel = i18n.translate('home.guidedOnboarding.gettingStarted.guideCard.stepsLabel', {
    defaultMessage: '{progress} steps',
    values: {
      progress: `${numberCompleteSteps}/${numberSteps}`,
    },
  });
  // guide is completed
  if (guideState.status === 'complete') {
    return (
      <>
        <EuiProgress
          valueText={stepsLabel}
          value={numberCompleteSteps}
          max={numberSteps}
          size="s"
          label={i18n.translate(
            'home.guidedOnboarding.gettingStarted.guideCard.progress.completedLabel',
            {
              defaultMessage: 'Completed',
            }
          )}
        />
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              // Used for FS tracking
              data-test-subj={`onboarding--guideCard--view--${useCase}`}
              fill
              onClick={() => activateGuide(useCase, guideState)}
            >
              {i18n.translate(
                'home.guidedOnboarding.gettingStarted.guideCard.startGuide.buttonLabel',
                {
                  defaultMessage: 'View guide',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
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
          'home.guidedOnboarding.gettingStarted.guideCard.progress.inProgressLabel',
          {
            defaultMessage: 'In progress',
          }
        )}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            // Used for FS tracking
            data-test-subj={`onboarding--guideCard--continue--${useCase}`}
            fill
            onClick={() => activateGuide(useCase, guideState)}
          >
            {i18n.translate(
              'home.guidedOnboarding.gettingStarted.guideCard.continueGuide.buttonLabel',
              {
                defaultMessage: 'Continue',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
export interface GuideCardProps {
  useCase: UseCase;
  guides: GuideState[];
  activateGuide: (useCase: UseCase, guide?: GuideState) => Promise<void>;
  http: HttpStart;
  uiSettings: IUiSettingsClient;
}
export const GuideCard = ({ useCase, guides, activateGuide, http, uiSettings }: GuideCardProps) => {
  const footer = getCardFooter(guides, useCase, activateGuide);
  return (
    <UseCaseCard
      useCase={useCase}
      title={constants[useCase].i18nTexts.title}
      description={constants[useCase].i18nTexts.description}
      footer={footer}
      http={http}
      uiSettings={uiSettings}
    />
  );
};
