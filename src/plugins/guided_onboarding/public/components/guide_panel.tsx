/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
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
import { guidesConfig } from '../constants/guides_config';
import type { GuideState, GuideStepIds } from '../../common/types';
import type { GuideConfig, StepConfig } from '../types';

import type { ApiService } from '../services/api';

import { GuideStep } from './guide_panel_step';
import { getGuidePanelStyles } from './guide_panel.styles';

interface GuidePanelProps {
  api: ApiService;
  application: ApplicationStart;
}

const getConfig = (state?: GuideState): GuideConfig | undefined => {
  if (state) {
    return guidesConfig[state.guideId];
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

const getProgress = (state?: GuideState): number => {
  if (state) {
    return state.steps.reduce((acc, currentVal) => {
      if (currentVal.status === 'complete') {
        acc = acc + 1;
      }
      return acc;
    }, 0);
  }
  return 0;
};

export const GuidePanel = ({ api, application }: GuidePanelProps) => {
  const { euiTheme } = useEuiTheme();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideState, setGuideState] = useState<GuideState | undefined>(undefined);

  const styles = getGuidePanelStyles(euiTheme);

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const navigateToStep = async (stepId: GuideStepIds, stepLocation: StepConfig['location']) => {
    await api.startGuideStep(guideState!.guideId, stepId);
    if (stepLocation) {
      application.navigateToApp(stepLocation.appID, { path: stepLocation.path });
    }
  };

  const navigateToLandingPage = () => {
    setIsGuideOpen(false);
    application.navigateToApp('home', { path: '#getting_started' });
  };

  const completeGuide = async () => {
    await api.completeGuide(guideState!.guideId);
  };

  useEffect(() => {
    const subscription = api.fetchActiveGuideState$().subscribe((newGuideState) => {
      if (newGuideState) {
        setGuideState(newGuideState);
      }
    });
    return () => subscription.unsubscribe();
  }, [api]);

  useEffect(() => {
    const subscription = api.isGuidePanelOpen$.subscribe((isGuidePanelOpen) => {
      setIsGuideOpen(isGuidePanelOpen);
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
  const stepsCompleted = getProgress(guideState);

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

              {/* Progress bar should only show after the first step has been complete */}
              {stepsCompleted > 0 && (
                <>
                  <EuiSpacer size="xl" />
                  <EuiProgress
                    data-test-subj="guideProgress"
                    label={i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
                      defaultMessage: 'Progress',
                    })}
                    value={stepsCompleted}
                    valueText={i18n.translate('guidedOnboarding.dropdownPanel.progressValueLabel', {
                      defaultMessage: '{stepCount} steps',
                      values: {
                        stepCount: `${stepsCompleted} / ${guideConfig.steps.length}`,
                      },
                    })}
                    max={guideConfig.steps.length}
                    size="l"
                  />

                  <EuiSpacer size="s" />
                </>
              )}

              <EuiHorizontalRule />

              {guideConfig?.steps.map((step, index, steps) => {
                const accordionId = htmlIdGenerator(`accordion${index}`)();
                const stepState = guideState?.steps[index];

                if (stepState) {
                  return (
                    <GuideStep
                      accordionId={accordionId}
                      stepStatus={stepState.status}
                      stepConfig={step}
                      stepNumber={index + 1}
                      navigateToStep={navigateToStep}
                      key={accordionId}
                    />
                  );
                }
              })}

              {guideState?.status === 'ready_to_complete' && (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton onClick={completeGuide} fill data-test-subj="useElasticButton">
                      {i18n.translate('guidedOnboarding.dropdownPanel.elasticButtonLabel', {
                        defaultMessage: 'Continue using Elastic',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
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
