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
import { HttpStart } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { guidesConfig } from '../constants';
import type { GuideConfig, StepStatus, GuidedSetupState, StepConfig } from '../types';
import type { ApiService } from '../services/api';

import { GuidedSetupStep } from './guided_setup_panel_step';
import { setupGuidePanelStyles } from './guided_setup_panel.styles';

interface Props {
  api: ApiService;
  application: ApplicationStart;
  http: HttpStart;
}

const getConfig = (state?: GuidedSetupState): GuideConfig | undefined => {
  if (state?.activeGuide && state.activeGuide !== 'unset') {
    return guidesConfig[state.activeGuide];
  }

  return undefined;
};

const getCurrentStep = (steps?: StepConfig[], state?: GuidedSetupState): number | undefined => {
  if (steps && state?.activeStep) {
    const activeStepIndex = steps.findIndex((step: StepConfig) => step.id === state.activeStep);
    if (activeStepIndex > -1) {
      return activeStepIndex + 1;
    }

    return undefined;
  }
};

const getStepStatus = (steps: StepConfig[], stepIndex: number, activeStep?: string): StepStatus => {
  const activeStepIndex = steps.findIndex((step: StepConfig) => step.id === activeStep);

  if (activeStepIndex < stepIndex) {
    return 'incomplete';
  }

  if (activeStepIndex === stepIndex) {
    return 'in_progress';
  }

  return 'complete';
};

export const GuidedSetupPanel = ({ api, application }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guidedSetupState, setGuidedSetupState] = useState<GuidedSetupState | undefined>(undefined);
  const isFirstRender = useRef(true);

  const styles = setupGuidePanelStyles(euiTheme);

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const navigateToStep = (step: StepConfig) => {
    setIsGuideOpen(false);
    if (step.location) {
      application.navigateToApp(step.location.appID, { path: step.location.path });
    }
  };

  const navigateToLandingPage = () => {
    application.navigateToApp('home', { path: '#getting_started' });
  };

  useEffect(() => {
    const subscription = api.fetchGuideState$().subscribe((newState) => {
      if (
        guidedSetupState?.activeGuide !== newState.activeGuide ||
        guidedSetupState?.activeStep !== newState.activeStep
      ) {
        if (isFirstRender.current) {
          isFirstRender.current = false;
        } else {
          setIsGuideOpen(true);
        }
      }
      setGuidedSetupState(newState);
    });
    return () => subscription.unsubscribe();
  }, [api, guidedSetupState?.activeGuide, guidedSetupState?.activeStep]);

  const guideConfig = getConfig(guidedSetupState);

  // TODO handle loading, error state
  // https://github.com/elastic/kibana/issues/139799, https://github.com/elastic/kibana/issues/139798
  if (!guideConfig) {
    return (
      <EuiButton onClick={toggleGuide} color="success" fill isDisabled={true} size="s">
        {i18n.translate('guidedOnboarding.disabledGuidedSetupButtonLabel', {
          defaultMessage: 'Setup guide',
        })}
      </EuiButton>
    );
  }

  const currentStep = getCurrentStep(guideConfig.steps, guidedSetupState);

  return (
    <>
      <EuiButton onClick={toggleGuide} color="success" fill size="s">
        {currentStep
          ? i18n.translate('guidedOnboarding.guidedSetupStepButtonLabel', {
              defaultMessage: 'Setup guide: Step {currentStep}',
              values: {
                currentStep,
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

              <EuiSpacer size="xl" />

              {/*
                 TODO: Progress bar should only show after the first step has been started
                 We need to make changes to the state itself in order to support this
               */}
              <EuiProgress
                label={i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
                  defaultMessage: 'Progress',
                })}
                value={currentStep ? currentStep - 1 : 0}
                valueText={i18n.translate('guidedOnboarding.dropdownPanel.progressValueLabel', {
                  defaultMessage: '{stepCount} steps',
                  values: {
                    stepCount: `${currentStep ? currentStep - 1 : 0} / ${guideConfig.steps.length}`,
                  },
                })}
                max={guideConfig.steps.length}
                size="l"
              />

              <EuiSpacer size="s" />

              <EuiHorizontalRule />

              {guideConfig?.steps.map((step, index, steps) => {
                const accordionId = htmlIdGenerator(`accordion${index}`)();
                const stepStatus = getStepStatus(steps, index, guidedSetupState?.activeStep);

                return (
                  <GuidedSetupStep
                    accordionId={accordionId}
                    stepStatus={stepStatus}
                    stepConfig={step}
                    stepNumber={index + 1}
                    navigateToStep={navigateToStep}
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
                    defaultMessage={`How’s onboarding? We’d love your {feedbackLink}`}
                    values={{
                      feedbackLink: (
                        <EuiLink
                          href="https://www.elastic.co/kibana/feedback"
                          target="_blank"
                          external
                        >
                          {i18n.translate(
                            'guidedOnboarding.dropdownPanel.footer.feedbackDescription',
                            {
                              defaultMessage: 'feedback',
                            }
                          )}
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
                    defaultMessage={`Other questions? We're {helpLink}`}
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
