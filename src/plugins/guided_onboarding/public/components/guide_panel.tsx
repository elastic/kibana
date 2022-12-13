/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
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

import { ApplicationStart, NotificationsStart } from '@kbn/core/public';
import type { GuideState, GuideStep as GuideStepStatus } from '@kbn/guided-onboarding';

import { GuideId } from '@kbn/guided-onboarding';
import type { GuidedOnboardingApi } from '../types';

import type { GuideConfig, PluginState, StepConfig } from '../../common';

import { GuideStep } from './guide_panel_step';
import { QuitGuideModal } from './quit_guide_modal';
import { getGuidePanelStyles } from './guide_panel.styles';
import { GuideButton } from './guide_button';

interface GuidePanelProps {
  api: GuidedOnboardingApi;
  application: ApplicationStart;
  notifications: NotificationsStart;
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

// Temporarily provide a different guide ID for telemetry purposes
// Should not be necessary once https://github.com/elastic/kibana/issues/144452 is addressed
const getTelemetryGuideId = (guideId?: GuideId) => {
  switch (guideId) {
    case 'security':
      return 'siem';
    case 'observability':
      return 'kubernetes';
    case 'search':
    default:
      return guideId;
  }
};

export const GuidePanel = ({ api, application, notifications }: GuidePanelProps) => {
  const { euiTheme } = useEuiTheme();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuitGuideModalOpen, setIsQuitGuideModalOpen] = useState(false);
  const [pluginState, setPluginState] = useState<PluginState | undefined>(undefined);
  const [guideConfig, setGuideConfig] = useState<GuideConfig | undefined>(undefined);

  const styles = getGuidePanelStyles(euiTheme);

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const handleStepButtonClick = async (step: GuideStepStatus, stepConfig: StepConfig) => {
    if (pluginState) {
      const { id, status } = step;
      const guideId: GuideId = pluginState!.activeGuide!.guideId!;

      try {
        if (status === 'ready_to_complete') {
          return await api.completeGuideStep(guideId, id);
        }

        if (status === 'active' || status === 'in_progress') {
          await api.startGuideStep(guideId, id);

          if (stepConfig.location) {
            await application.navigateToApp(stepConfig.location.appID, {
              path: stepConfig.location.path,
            });

            if (stepConfig.manualCompletion?.readyToCompleteOnNavigation) {
              await api.completeGuideStep(guideId, id);
            }
          }
        }
      } catch (error) {
        notifications.toasts.addDanger({
          title: i18n.translate('guidedOnboarding.dropdownPanel.stepHandlerError', {
            defaultMessage: 'Unable to update the guide. Wait a moment and try again.',
          }),
          text: error.message,
        });
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
    try {
      await api.completeGuide(pluginState!.activeGuide!.guideId!);

      if (completedGuideRedirectLocation) {
        const { appID, path } = completedGuideRedirectLocation;
        application.navigateToApp(appID, { path });
      }
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('guidedOnboarding.dropdownPanel.completeGuideError', {
          defaultMessage: 'Unable to update the guide. Wait a moment and try again.',
        }),
        text: error.message,
      });
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
    const subscription = api.fetchPluginState$().subscribe((newPluginState) => {
      setPluginState(newPluginState);
    });
    return () => subscription.unsubscribe();
  }, [api]);

  useEffect(() => {
    const subscription = api.isGuidePanelOpen$.subscribe((isGuidePanelOpen) => {
      setIsGuideOpen(isGuidePanelOpen);
    });
    return () => subscription.unsubscribe();
  }, [api]);

  const fetchGuideConfig = useCallback(async () => {
    if (pluginState?.activeGuide?.guideId) {
      const config = await api.getGuideConfig(pluginState.activeGuide.guideId);
      if (config) setGuideConfig(config);
    }
  }, [api, pluginState]);

  useEffect(() => {
    fetchGuideConfig();
  }, [fetchGuideConfig]);

  // TODO handle loading state
  // https://github.com/elastic/kibana/issues/139799

  const stepsCompleted = getProgress(pluginState?.activeGuide);
  const isGuideReadyToComplete = pluginState?.activeGuide?.status === 'ready_to_complete';
  const telemetryGuideId = getTelemetryGuideId(pluginState?.activeGuide?.guideId);

  return (
    <>
      <div css={styles.setupButton}>
        <GuideButton
          pluginState={pluginState}
          guideConfig={guideConfig}
          toggleGuidePanel={toggleGuide}
          isGuidePanelOpen={isGuideOpen}
          navigateToLandingPage={navigateToLandingPage}
        />
      </div>

      {isGuideOpen && guideConfig && (
        <EuiFlyout
          ownFocus
          onClose={toggleGuide}
          aria-labelledby="onboarding-guide"
          css={styles.flyoutOverrides.flyoutContainer}
          maskProps={{ headerZindexLocation: 'above' }}
          data-test-subj="guidePanel"
          maxWidth={480}
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
                const stepState = pluginState?.activeGuide?.steps[index];

                if (stepState) {
                  return (
                    <GuideStep
                      accordionId={accordionId}
                      stepStatus={stepState.status}
                      stepConfig={step}
                      stepNumber={index + 1}
                      handleButtonClick={() => handleStepButtonClick(stepState, step)}
                      key={accordionId}
                      telemetryGuideId={telemetryGuideId!}
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
                      // data-test-subj used for FS tracking and testing
                      data-test-subj={`onboarding--completeGuideButton--${telemetryGuideId}`}
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
            <EuiFlexGroup
              alignItems="center"
              justifyContent="center"
              gutterSize="xs"
              responsive={false}
              wrap
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="questionInCircle"
                  iconSide="right"
                  href="https://cloud.elastic.co/support "
                  target="_blank"
                  css={styles.flyoutOverrides.flyoutFooterLink}
                  iconSize="m"
                >
                  {i18n.translate('guidedOnboarding.dropdownPanel.footer.support', {
                    defaultMessage: 'Need help?',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color={euiTheme.colors.disabled}>
                  |
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="faceHappy"
                  iconSide="right"
                  href="https://www.elastic.co/kibana/feedback"
                  target="_blank"
                  css={styles.flyoutOverrides.flyoutFooterLink}
                  iconSize="s"
                >
                  {i18n.translate('guidedOnboarding.dropdownPanel.footer.feedback', {
                    defaultMessage: 'Give feedback',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color={euiTheme.colors.disabled}>
                  |
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="exit"
                  iconSide="right"
                  onClick={openQuitGuideModal}
                  data-test-subj="quitGuideButton"
                  css={styles.flyoutOverrides.flyoutFooterLink}
                  iconSize="s"
                >
                  {i18n.translate('guidedOnboarding.dropdownPanel.footer.exitGuideButtonLabel', {
                    defaultMessage: 'Quit guide',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}

      {isQuitGuideModalOpen && (
        <QuitGuideModal
          closeModal={closeQuitGuideModal}
          currentGuide={pluginState!.activeGuide!}
          telemetryGuideId={telemetryGuideId!}
          notifications={notifications}
        />
      )}
    </>
  );
};
