/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, map, Observable, firstValueFrom, concat, of } from 'rxjs';
import type { GuideState, GuideId, GuideStep, GuideStepIds } from '@kbn/guided-onboarding';

import { GuidedOnboardingApi } from '../types';
import {
  getGuideConfig,
  getInProgressStepId,
  getStepConfig,
  getUpdatedSteps,
  getGuideStatusOnStepCompletion,
  isIntegrationInGuideStep,
  isStepInProgress,
  isStepReadyToComplete,
  isGuideActive,
} from './helpers';
import { API_BASE_PATH } from '../../common/constants';
import { PluginState, PluginStatus } from '../../common/types';

export class ApiService implements GuidedOnboardingApi {
  private isCloudEnabled: boolean | undefined;
  private client: HttpSetup | undefined;
  private pluginState$!: BehaviorSubject<PluginState | undefined>;
  private isPluginStateLoading: boolean | undefined;
  public isGuidePanelOpen$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public setup(httpClient: HttpSetup, isCloudEnabled: boolean) {
    this.isCloudEnabled = isCloudEnabled;
    this.client = httpClient;
    this.pluginState$ = new BehaviorSubject<PluginState | undefined>(undefined);
    this.isGuidePanelOpen$ = new BehaviorSubject<boolean>(false);
  }

  private createGetPluginStateObservable(): Observable<PluginState | undefined> {
    return new Observable<PluginState | undefined>((observer) => {
      const controller = new AbortController();
      const signal = controller.signal;
      this.isPluginStateLoading = true;
      this.client!.get<{ pluginState: PluginState }>(`${API_BASE_PATH}/state`, {
        signal,
      })
        .then(({ pluginState }) => {
          this.isPluginStateLoading = false;
          observer.next(pluginState);
          this.pluginState$.next(pluginState);
          observer.complete();
        })
        .catch((error) => {
          this.isPluginStateLoading = false;
          observer.error(error);
        });
      return () => {
        this.isPluginStateLoading = false;
        controller.abort();
      };
    });
  }

  /**
   * An Observable with the plugin state.
   * Initially the state is fetched from the backend.
   * Subsequently, the observable is updated automatically, when the state changes.
   */
  public fetchPluginState$(): Observable<PluginState | undefined> {
    if (!this.isCloudEnabled) {
      return of(undefined);
    }
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    const currentState = this.pluginState$.value;
    // if currentState is undefined, it was not fetched from the backend yet
    // or the request was cancelled or failed
    // also check if we don't have a request in flight already
    if (!currentState && !this.isPluginStateLoading) {
      this.isPluginStateLoading = true;
      return concat(this.createGetPluginStateObservable(), this.pluginState$);
    }
    return this.pluginState$;
  }

  /**
   * Async operation to fetch state for all guides
   * This is useful for the onboarding landing page,
   * where all guides are displayed with their corresponding status
   */
  public async fetchAllGuidesState(): Promise<{ state: GuideState[] } | undefined> {
    if (!this.isCloudEnabled) {
      return undefined;
    }
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      return await this.client.get<{ state: GuideState[] }>(`${API_BASE_PATH}/guides`);
    } catch (error) {
      // TODO handle error
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  /**
   * Updates the SO with the updated guide state and refreshes the observables
   * This is largely used internally and for tests
   * @param {GuideState} newState the updated guide state
   * @param {boolean} panelState boolean to determine whether the dropdown panel should open or not
   * @return {Promise} a promise with the updated guide state
   */
  public async updatePluginState(
    state: { status?: PluginStatus; guide?: GuideState },
    panelState: boolean
  ): Promise<{ pluginState: PluginState } | undefined> {
    if (!this.isCloudEnabled) {
      return undefined;
    }
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      const response = await this.client.put<{ pluginState: PluginState }>(
        `${API_BASE_PATH}/state`,
        {
          body: JSON.stringify(state),
        }
      );
      // update the guide state in the plugin state observable
      this.pluginState$.next(response.pluginState);
      this.isGuidePanelOpen$.next(panelState);
      return response;
    } catch (error) {
      // TODO handle error
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  /**
   * Activates a guide by guideId
   * This is useful for the onboarding landing page, when a user selects a guide to start or continue
   * @param {GuideId} guideId the id of the guide (one of search, observability, security)
   * @param {GuideState} guide (optional) the selected guide state, if it exists (i.e., if a user is continuing a guide)
   * @return {Promise} a promise with the updated guide state
   */
  public async activateGuide(
    guideId: GuideId,
    guide?: GuideState
  ): Promise<{ pluginState: PluginState } | undefined> {
    // If we already have the guide state (i.e., user has already started the guide at some point),
    // simply pass it through so they can continue where they left off, and update the guide to active
    if (guide) {
      return await this.updatePluginState(
        {
          status: 'in_progress',
          guide: {
            ...guide,
            isActive: true,
          },
        },
        true
      );
    }

    // If this is the 1st-time attempt, we need to create the default state
    const guideConfig = getGuideConfig(guideId);

    if (guideConfig) {
      const updatedSteps: GuideStep[] = guideConfig.steps.map((step, stepIndex) => {
        const isFirstStep = stepIndex === 0;
        return {
          id: step.id,
          // Only the first step should be activated when activating a new guide
          status: isFirstStep ? 'active' : 'inactive',
        };
      });

      const updatedGuide: GuideState = {
        guideId,
        isActive: true,
        status: 'not_started',
        steps: updatedSteps,
      };

      return await this.updatePluginState(
        {
          status: 'in_progress',
          guide: updatedGuide,
        },
        true
      );
    }
  }

  /**
   * Marks a guide as inactive
   * This is useful for the dropdown panel, when a user quits a guide
   * @param {GuideState} guide the selected guide state
   * @return {Promise} a promise with the updated guide state
   */
  public async deactivateGuide(
    guide: GuideState
  ): Promise<{ pluginState: PluginState } | undefined> {
    return await this.updatePluginState(
      {
        status: 'quit',
        guide: {
          ...guide,
          isActive: false,
        },
      },
      false
    );
  }

  /**
   * Completes a guide
   * Updates the overall guide status to 'complete', and marks it as inactive
   * This is useful for the dropdown panel, when the user clicks the "Continue using Elastic" button after completing all steps
   * @param {GuideId} guideId the id of the guide (one of search, observability, security)
   * @return {Promise} a promise with the updated guide state
   */
  public async completeGuide(guideId: GuideId): Promise<{ pluginState: PluginState } | undefined> {
    const pluginState = await firstValueFrom(this.fetchPluginState$());

    // For now, returning undefined if consumer attempts to complete a guide that is not active
    if (!isGuideActive(pluginState, guideId)) return undefined;

    const { activeGuide } = pluginState!;

    // All steps should be complete at this point
    // However, we do a final check here as a safeguard
    const allStepsComplete =
      Boolean(activeGuide!.steps.find((step) => step.status !== 'complete')) === false;

    if (allStepsComplete) {
      const updatedGuide: GuideState = {
        ...activeGuide!,
        isActive: false,
        status: 'complete',
      };

      return await this.updatePluginState({ status: 'complete', guide: updatedGuide }, false);
    }
  }

  /**
   * An observable with the boolean value if the step is in progress (i.e., user clicked "Start" on a step).
   * Returns true, if the passed params identify the guide step that is currently in progress.
   * Returns false otherwise.
   * @param {GuideId} guideId the id of the guide (one of search, observability, security)
   * @param {GuideStepIds} stepId the id of the step in the guide
   * @return {Observable} an observable with the boolean value
   */
  public isGuideStepActive$(guideId: GuideId, stepId: GuideStepIds): Observable<boolean> {
    return this.fetchPluginState$().pipe(
      map((pluginState) => {
        if (!isGuideActive(pluginState, guideId)) return false;
        return isStepInProgress(pluginState!.activeGuide, guideId, stepId);
      })
    );
  }

  /**
   * Updates the selected step to 'in_progress' state
   * This is useful for the dropdown panel, when the user clicks the "Start" button for the active step
   * @param {GuideId} guideId the id of the guide (one of search, observability, security)
   * @param {GuideStepIds} stepId the id of the step
   * @return {Promise} a promise with the updated guide state
   */
  public async startGuideStep(
    guideId: GuideId,
    stepId: GuideStepIds
  ): Promise<{ pluginState: PluginState } | undefined> {
    const pluginState = await firstValueFrom(this.fetchPluginState$());

    // For now, returning undefined if consumer attempts to start a step for a guide that isn't active
    if (!isGuideActive(pluginState, guideId)) {
      return undefined;
    }
    const { activeGuide } = pluginState!;

    const updatedSteps: GuideStep[] = activeGuide!.steps.map((step) => {
      // Mark the current step as in_progress
      if (step.id === stepId) {
        return {
          id: step.id,
          status: 'in_progress',
        };
      }

      // All other steps return as-is
      return step;
    });

    const currentGuide: GuideState = {
      guideId,
      isActive: true,
      status: 'in_progress',
      steps: updatedSteps,
    };

    return await this.updatePluginState({ guide: currentGuide }, false);
  }

  /**
   * Completes the guide step identified by the passed params.
   * A noop if the passed step is not active.
   * @param {GuideId} guideId the id of the guide (one of search, observability, security)
   * @param {GuideStepIds} stepId the id of the step in the guide
   * @return {Promise} a promise with the updated state or undefined if the operation fails
   */
  public async completeGuideStep(
    guideId: GuideId,
    stepId: GuideStepIds
  ): Promise<{ pluginState: PluginState } | undefined> {
    const pluginState = await firstValueFrom(this.fetchPluginState$());
    // For now, returning undefined if consumer attempts to complete a step for a guide that isn't active
    if (!isGuideActive(pluginState, guideId)) {
      return undefined;
    }
    const { activeGuide } = pluginState!;
    const isCurrentStepInProgress = isStepInProgress(activeGuide, guideId, stepId);
    const isCurrentStepReadyToComplete = isStepReadyToComplete(activeGuide, guideId, stepId);

    const stepConfig = getStepConfig(activeGuide!.guideId, stepId);
    const isManualCompletion = stepConfig ? !!stepConfig.manualCompletion : false;

    if (isCurrentStepInProgress || isCurrentStepReadyToComplete) {
      const updatedSteps = getUpdatedSteps(
        activeGuide!,
        stepId,
        // if current step is in progress and configured for manual completion,
        // set the status to ready_to_complete
        isManualCompletion && isCurrentStepInProgress
      );

      const currentGuide: GuideState = {
        guideId,
        isActive: true,
        status: getGuideStatusOnStepCompletion(activeGuide, guideId, stepId),
        steps: updatedSteps,
      };

      return await this.updatePluginState(
        {
          guide: currentGuide,
        },
        // the panel is opened when the step is being set to complete.
        // that happens when the step is not configured for manual completion
        // or it's already ready_to_complete
        !isManualCompletion || isCurrentStepReadyToComplete
      );
    }

    return undefined;
  }

  /**
   * An observable with the boolean value if the guided onboarding is currently active for the integration.
   * Returns true, if the passed integration is used in the current guide's step.
   * Returns false otherwise.
   * @param {string} integration the integration (package name) to check for in the guided onboarding config
   * @return {Observable} an observable with the boolean value
   */
  public isGuidedOnboardingActiveForIntegration$(integration?: string): Observable<boolean> {
    return this.fetchPluginState$().pipe(
      map((state) => isIntegrationInGuideStep(state?.activeGuide, integration))
    );
  }

  public async completeGuidedOnboardingForIntegration(
    integration?: string
  ): Promise<{ pluginState: PluginState } | undefined> {
    if (!integration) return undefined;
    const pluginState = await firstValueFrom(this.fetchPluginState$());
    if (!isGuideActive(pluginState)) return undefined;
    const { activeGuide } = pluginState!;
    const inProgressStepId = getInProgressStepId(activeGuide!);
    if (!inProgressStepId) return undefined;
    const isIntegrationStepActive = isIntegrationInGuideStep(activeGuide!, integration);
    if (isIntegrationStepActive) {
      return await this.completeGuideStep(activeGuide!.guideId, inProgressStepId);
    }
  }

  public async skipGuidedOnboarding(): Promise<{ pluginState: PluginState } | undefined> {
    // TODO error handling and loading state
    return await this.updatePluginState({ status: 'skipped' }, false);
  }
}

export const apiService = new ApiService();
