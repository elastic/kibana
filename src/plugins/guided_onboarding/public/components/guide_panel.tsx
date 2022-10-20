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

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ApplicationStart } from '@kbn/core/public';
import type { GuideState, GuideStep as GuideStepStatus } from '@kbn/guided-onboarding';

import type { GuideConfig, StepConfig } from '../types';

import type { ApiService } from '../services/api';
import { getGuideConfig } from '../services/helpers';

import { GuideStep } from './guide_panel_step';
import { QuitGuideModal } from './quit_guide_modal';
import { getGuidePanelStyles } from './guide_panel.styles';
import { GuideButton } from './guide_button';

interface GuidePanelProps {
  api: ApiService;
  application: ApplicationStart;
}

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
  const [isQuitGuideModalOpen, setIsQuitGuideModalOpen] = useState(false);
  const [guideState, setGuideState] = useState<GuideState | undefined>(undefined);

  const styles = getGuidePanelStyles(euiTheme);

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const handleStepButtonClick = async (step: GuideStepStatus, stepConfig: StepConfig) => {
    if (guideState) {
      const { id, status } = step;
      if (status === 'ready_to_complete') {
        return await api.completeGuideStep(guideState?.guideId, id);
      }

      if (status === 'active') {
        await api.startGuideStep(guideState!.guideId, id);
      }
      if (status === 'active' || status === 'in_progress') {
        if (stepConfig.location) {
          await application.navigateToApp(stepConfig.location.appID, {
            path: stepConfig.location.path,
          });
          if (stepConfig.manualCompletion?.readyToCompleteOnNavigation) {
            await api.completeGuideStep(guideState.guideId, id);
          }
        }
      }
    }
  };

  const navigateToLandingPage = () => {
    setIsGuideOpen(false);
    application.navigateToApp('home', { path: '#getting_started' });
  };

  const completeGuide = async (
    completedGuideRedirectLocation: GuideConfig['completedGuideRedirectLocation']
  ) => {
    await api.completeGuide(guideState!.guideId);

    if (completedGuideRedirectLocation) {
      const { appID, path } = completedGuideRedirectLocation;
      application.navigateToApp(appID, { path });
    }
  };

  const openQuitGuideModal = () => {
    // Close the dropdown panel
    setIsGuideOpen(false);
    // Open the confirmation modal
    setIsQuitGuideModalOpen(true);
  };

  const closeQuitGuideModal = () => {
    setIsQuitGuideModalOpen(false);
  };

  useEffect(() => {
    const subscription = api.fetchActiveGuideState$().subscribe((newGuideState) => {
      setGuideState(newGuideState);
    });
    return () => subscription.unsubscribe();
  }, [api]);

  useEffect(() => {
    const subscription = api.isGuidePanelOpen$.subscribe((isGuidePanelOpen) => {
      setIsGuideOpen(isGuidePanelOpen);
    });
    return () => subscription.unsubscribe();
  }, [api]);

  const guideConfig = getGuideConfig(guideState?.guideId);

  // TODO handle loading, error state
  // https://github.com/elastic/kibana/issues/139799, https://github.com/elastic/kibana/issues/139798
  if (!guideConfig) {
    // TODO button show/hide logic https://github.com/elastic/kibana/issues/141129
    return null;
  }

  const stepsCompleted = getProgress(guideState);
  const isGuideReadyToComplete = guideState?.status === 'ready_to_complete';

  return (
    <>
      <GuideButton
        guideState={guideState!}
        toggleGuidePanel={toggleGuide}
        isGuidePanelOpen={isGuideOpen}
      />

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
              <h2 data-test-subj="guideTitle">
                {isGuideReadyToComplete
                  ? i18n.translate('guidedOnboarding.dropdownPanel.completeGuideFlyoutTitle', {
                      defaultMessage: 'Well done!',
                    })
                  : guideConfig.title}
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />
            <EuiHorizontalRule margin="s" />
          </EuiFlyoutHeader>

          <EuiFlyoutBody css={styles.flyoutOverrides.flyoutBody}>
            <div>
              <EuiText size="m">
                <p data-test-subj="guideDescription">
                  {isGuideReadyToComplete
                    ? i18n.translate(
                        'guidedOnboarding.dropdownPanel.completeGuideFlyoutDescription',
                        {
                          defaultMessage: `You've completed the Elastic {guideName} guide.`,
                          values: {
                            guideName: guideConfig.guideName,
                          },
                        }
                      )
                    : guideConfig.description}
                </p>
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
                    label={
                      isGuideReadyToComplete
                        ? i18n.translate('guidedOnboarding.dropdownPanel.completedLabel', {
                            defaultMessage: 'Completed',
                          })
                        : i18n.translate('guidedOnboarding.dropdownPanel.progressLabel', {
                            defaultMessage: 'Progress',
                          })
                    }
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

              {guideConfig?.steps.map((step, index) => {
                const accordionId = htmlIdGenerator(`accordion${index}`)();
                const stepState = guideState?.steps[index];

                if (stepState) {
                  return (
                    <GuideStep
                      accordionId={accordionId}
                      stepStatus={stepState.status}
                      stepConfig={step}
                      stepNumber={index + 1}
                      handleButtonClick={() => handleStepButtonClick(stepState, step)}
                      key={accordionId}
                    />
                  );
                }
              })}

              {isGuideReadyToComplete && (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => completeGuide(guideConfig.completedGuideRedirectLocation)}
                      fill
                      data-test-subj="useElasticButton"
                    >
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
                <EuiButtonEmpty onClick={openQuitGuideModal} data-test-subj="quitGuideButton">
                  {i18n.translate('guidedOnboarding.dropdownPanel.footer.exitGuideButtonLabel', {
                    defaultMessage: 'Quit setup guide',
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

      {isQuitGuideModalOpen && (
        <QuitGuideModal closeModal={closeQuitGuideModal} currentGuide={guideState!} />
      )}
    </>
  );
};
