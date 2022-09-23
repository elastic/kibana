/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiButton,
  EuiText,
  EuiProgress,
  EuiHorizontalRule,
  EuiSpacer,
  htmlIdGenerator,
  EuiButtonEmpty,
  EuiTitle,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';

import { ApplicationStart } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { guidesConfig } from '../../common/guides_config';
import type { GuideConfig, StepStatus, StepConfig, UseCase } from '../../common/types';
import type { GuidedOnboardingState, GuideState } from '../types';
import type { ApiService } from '../services/api';

import { GuideStep } from './guide_panel_step';
import { getGuidePanelStyles } from './guide_panel.styles';

interface GuidePanelProps {
  api: ApiService;
  application: ApplicationStart;
}

const getConfig = (state?: GuideState): GuideConfig | undefined => {
  if (state) {
    return guidesConfig[state.id];
  }

  return undefined;
};

const getStepNumber = (state?: GuideState): number | undefined => {
  let stepNumber: number | undefined;

  state?.steps.forEach((step, stepIndex) => {
    // If the step is in_progress, show that step number
    if (step.status === 'in_progress') {
      stepNumber = stepIndex + 1;
    }

    // If the step is active, show the previous step number
    if (step.status === 'active') {
      stepNumber = stepIndex;
    }
  });

  return stepNumber;
};

export const GuidePanel = ({ api, application }: GuidePanelProps) => {
  const { euiTheme } = useEuiTheme();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideState, setGuideState] = useState<GuideState | undefined>(undefined);
  const isFirstRender = useRef(true);

  const styles = getGuidePanelStyles(euiTheme);

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const navigateToStep = async (stepID: string, stepLocation: StepConfig['location']) => {
    setIsGuideOpen(false);
    await api.startGuideStep(guideState!.id, stepID);
    if (stepLocation) {
      application.navigateToApp(stepLocation.appID, { path: stepLocation.path });
    }
  };

  const navigateToLandingPage = () => {
    // TODO: Any state updates needed here?
    setIsGuideOpen(false);
    application.navigateToApp('home', { path: '#getting_started' });
  };

  useEffect(() => {
    const subscription = api.fetchGuideState$().subscribe((newState) => {
      console.log('subscribing newState', newState);
      // TODO fix how panel is open
      // if (
      //   guideState?.activeGuide !== newState.activeGuide ||
      //   guideState?.activeStep !== newState.activeStep
      // ) {
      //   if (isFirstRender.current) {
      //     isFirstRender.current = false;
      //   } else {
      //     setIsGuideOpen(true);
      //   }
      // }
      const guides = Object.keys(newState) as UseCase[];
      const activeGuide = guides.find(
        (guide) =>
          newState[guide].status === 'active' ||
          newState[guide].status === 'in_progress' ||
          newState[guide].status === 'ready_to_complete'
      );
      // TODO not sure if this is needed
      const activeStep = activeGuide
        ? newState[activeGuide].steps.find((step) => step.status === 'in_progress')
        : undefined;
      if (activeGuide) {
        setGuideState({
          ...newState[activeGuide],
          id: activeGuide,
          activeStep: activeStep?.id,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [api]);

  const guideConfig = getConfig(guideState);

  // TODO handle loading, error state
  // https://github.com/elastic/kibana/issues/139799, https://github.com/elastic/kibana/issues/139798
  if (!guideConfig) {
    return (
      <EuiButton
        onClick={toggleGuide}
        color="success"
        fill
        isDisabled={true}
        size="s"
        data-test-subj="disabledGuideButton"
      >
        {i18n.translate('guidedOnboarding.disabledGuidedSetupButtonLabel', {
          defaultMessage: 'Setup guide',
        })}
      </EuiButton>
    );
  }

  const stepNumber = getStepNumber(guideState);

  return (
    <>
      <EuiButton onClick={toggleGuide} color="success" fill size="s" data-test-subj="guideButton">
        {Boolean(stepNumber)
          ? i18n.translate('guidedOnboarding.guidedSetupStepButtonLabel', {
              defaultMessage: 'Setup guide: step {stepNumber}',
              values: {
                stepNumber,
              },
            })
          : i18n.translate('guidedOnboarding.guidedSetupButtonLabel', {
              defaultMessage: 'Setup guide',
            })}
      </EuiButton>

      {isGuideOpen && (
        <EuiFlyout
          ownFocus
          onClose={toggleGuide}
          aria-labelledby="onboarding-guide"
          css={styles.flyoutOverrides.flyoutContainer}
          maskProps={{ headerZindexLocation: 'above' }}
          data-test-subj="guidePanel"
        >
          <EuiFlyoutHeader>
            <EuiButtonEmpty
              onClick={navigateToLandingPage}
              iconSide="left"
              iconType="arrowLeft"
              flush="left"
              color="text"
            >
              {i18n.translate('guidedOnboarding.dropdownPanel.backToGuidesLink', {
                defaultMessage: 'Back to guides',
              })}
            </EuiButtonEmpty>

            <EuiTitle size="m">
              <h2>{guideConfig?.title}</h2>
            </EuiTitle>

            <EuiSpacer size="s" />
            <EuiHorizontalRule margin="s" />
          </EuiFlyoutHeader>

          <EuiFlyoutBody css={styles.flyoutOverrides.flyoutBody}>
            <div>
              <EuiText size="m">
                <p>{guideConfig?.description}</p>
              </EuiText>

              {guideConfig.docs && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="m">
                    <EuiLink external target="_blank" href={guideConfig.docs.url}>
                      {guideConfig.docs.text}
                    </EuiLink>
                  </EuiText>
                </>
              )}

              {/* TODO: Not working currently */}
              {/* Progress bar should only show after the first step has been started */}
              {guideState?.status === 'in_progress' ||
                (guideState?.status === 'complete' && (
                  <>
                    <EuiSpacer size="xl" />
                    <EuiProgress
                      label={i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
                        defaultMessage: 'Progress',
                      })}
                      value={stepNumber ? stepNumber : 0}
                      valueText={i18n.translate(
                        'guidedOnboarding.dropdownPanel.progressValueLabel',
                        {
                          defaultMessage: '{stepCount} steps',
                          values: {
                            stepCount: `${stepNumber ? stepNumber : 0} / ${
                              guideConfig.steps.length
                            }`,
                          },
                        }
                      )}
                      max={guideConfig.steps.length}
                      size="l"
                    />

                    <EuiSpacer size="s" />
                  </>
                ))}

              <EuiHorizontalRule />

              {guideConfig?.steps.map((step, index, steps) => {
                const accordionId = htmlIdGenerator(`accordion${index}`)();
                const stepState = guideState?.steps[index];

                return (
                  <GuideStep
                    accordionId={accordionId}
                    stepStatus={stepState?.status}
                    stepConfig={step}
                    stepNumber={index + 1}
                    navigateToStep={navigateToStep}
                    key={accordionId}
                  />
                );
              })}
            </div>
          </EuiFlyoutBody>

          <EuiFlyoutFooter css={styles.flyoutOverrides.flyoutFooter}>
            <EuiFlexGroup direction="column" alignItems="center" gutterSize="xs">
              <EuiFlexItem>
                {/* TODO: Implement exit guide modal - https://github.com/elastic/kibana/issues/139804 */}
                <EuiButtonEmpty onClick={() => {}}>
                  {i18n.translate('guidedOnboarding.dropdownPanel.footer.exitGuideButtonLabel', {
                    defaultMessage: 'Exit setup guide',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiText color="subdued" textAlign="center">
                  <FormattedMessage
                    id="guidedOnboarding.dropdownPanel.footer.feedbackDescription"
                    defaultMessage="How's onboarding? We’d love your {feedbackLink}"
                    values={{
                      feedbackLink: (
                        <EuiLink
                          href="https://www.elastic.co/kibana/feedback"
                          target="_blank"
                          external
                        >
                          {i18n.translate('guidedOnboarding.dropdownPanel.footer.feedbackLabel', {
                            defaultMessage: 'feedback',
                          })}
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiText color="subdued" textAlign="center">
                  <FormattedMessage
                    id="guidedOnboarding.dropdownPanel.footer.supportDescription"
                    defaultMessage="Other questions? We're {helpLink}"
                    values={{
                      helpLink: (
                        <EuiLink href="https://cloud.elastic.co/support " target="_blank" external>
                          {i18n.translate(
                            'guidedOnboarding.dropdownPanel.footer.helpTextDescription',
                            {
                              defaultMessage: 'here to help',
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
};
