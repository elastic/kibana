/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';

import { useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ApplicationStart, CoreTheme, NotificationsStart } from '@kbn/core/public';
import type { GuideState, GuideStep as GuideStepStatus } from '@kbn/guided-onboarding';

import type { GuideId, GuideConfig, StepConfig } from '@kbn/guided-onboarding';
import type { GuidedOnboardingApi } from '../types';

import type { PluginState } from '../../common';

import { QuitGuideModal } from './quit_guide_modal';
import { getGuidePanelStyles } from './guide_panel.styles';

import { GuidePanelFlyout } from './guide_panel_flyout';
import { getStepLocationPath } from './get_step_location';

interface GuidePanelProps {
  api: GuidedOnboardingApi;
  application: ApplicationStart;
  notifications: NotificationsStart;
  theme$: Observable<CoreTheme>;
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

export const GuidePanel = ({ api, application, notifications, theme$ }: GuidePanelProps) => {
  const euiThemeContext = useEuiTheme();
  const euiTheme = euiThemeContext.euiTheme;
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuitGuideModalOpen, setIsQuitGuideModalOpen] = useState(false);
  const [pluginState, setPluginState] = useState<PluginState | undefined>(undefined);
  const [guideConfig, setGuideConfig] = useState<GuideConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { darkMode: isDarkTheme } = useObservable(theme$, { darkMode: false, name: 'amsterdam' });

  const styles = getGuidePanelStyles({ euiThemeContext, isDarkTheme });

  const toggleGuide = () => {
    setIsGuideOpen((prevIsGuideOpen) => !prevIsGuideOpen);
  };

  const handleStepButtonClick = useCallback(
    async (step: GuideStepStatus, stepConfig: StepConfig) => {
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
                path: getStepLocationPath(stepConfig.location.path, pluginState),
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
    },
    [api, application, notifications.toasts, pluginState]
  );

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
    const subscription = api.isLoading$.subscribe((isLoadingValue) => {
      setIsLoading(isLoadingValue);
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
      if (config) {
        setGuideConfig(config);
      }
    }
  }, [api, pluginState]);

  useEffect(() => {
    fetchGuideConfig();
  }, [fetchGuideConfig]);

  const stepsCompleted = getProgress(pluginState?.activeGuide);
  const isGuideReadyToComplete = pluginState?.activeGuide?.status === 'ready_to_complete';

  return (
    <>
      <GuidePanelFlyout
        isOpen={isGuideOpen}
        isLoading={isLoading}
        styles={styles}
        toggleGuide={toggleGuide}
        isDarkTheme={isDarkTheme}
        stepsCompleted={stepsCompleted}
        isGuideReadyToComplete={isGuideReadyToComplete}
        guideConfig={guideConfig}
        navigateToLandingPage={navigateToLandingPage}
        pluginState={pluginState}
        handleStepButtonClick={handleStepButtonClick}
        openQuitGuideModal={openQuitGuideModal}
        euiTheme={euiTheme}
        completeGuide={completeGuide}
      />
      {isQuitGuideModalOpen && (
        <QuitGuideModal
          closeModal={closeQuitGuideModal}
          currentGuide={pluginState!.activeGuide!}
          telemetryGuideId={guideConfig!.telemetryId}
          notifications={notifications}
        />
      )}
    </>
  );
};
