/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  BehaviorSubject,
  map,
  Observable,
  firstValueFrom,
  concatMap,
  of,
  concat,
  from,
} from 'rxjs';
import type {
  GuideState,
  GuideId,
  GuideStep,
  GuideStepIds,
  GuideConfig,
} from '@kbn/guided-onboarding';

import { API_BASE_PATH } from '../../common';
import type { PluginState, PluginStatus } from '../../common';
import { GuidedOnboardingApi } from '../types';
import {
  getInProgressStepId,
  getCompletedSteps,
  isStepInProgress,
  isStepReadyToComplete,
  isGuideActive,
  getStepConfig,
  isLastStep,
} from './helpers';
import { ConfigService } from './config.service';

export class ApiService implements GuidedOnboardingApi {
  private isCloudEnabled: boolean | undefined;
  private client: HttpSetup | undefined;
  private pluginState$!: BehaviorSubject<PluginState | undefined>;
  public isLoading$ = new BehaviorSubject<boolean>(false);
  public isGuidePanelOpen$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private configService = new ConfigService();

  public setup(httpClient: HttpSetup, isCloudEnabled: boolean) {
    this.isCloudEnabled = isCloudEnabled;
    this.client = httpClient;
    this.pluginState$ = new BehaviorSubject<PluginState | undefined>(undefined);
    this.isGuidePanelOpen$ = new BehaviorSubject<boolean>(false);
    this.isLoading$ = new BehaviorSubject<boolean>(false);
    this.configService.setup(httpClient);
  }

  private createGetPluginStateObservable(): Observable<PluginState | undefined> {
    return new Observable<PluginState | undefined>((observer) => {
      const controller = new AbortController();
      const signal = controller.signal;
      this.isLoading$.next(true);
      this.client!.get<{ pluginState: PluginState }>(`${API_BASE_PATH}/state`, {
        signal,
      })
        .then(({ pluginState }) => {
          this.isLoading$.next(false);
          observer.next(pluginState);
          this.pluginState$.next(pluginState);
          observer.complete();
        })
        .catch((error) => {
          this.isLoading$.next(false);
          // if the request fails, we initialize the state with error
          observer.next({ status: 'error', isActivePeriod: false });
          this.pluginState$.next({
            status: 'error',
            isActivePeriod: false,
          });
          observer.complete();
        });
      return () => {
        this.isLoading$.next(false);
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
    if (!currentState && !this.isLoading$.value) {
      this.isLoading$.next(true);
      return concat(this.createGetPluginStateObservable(), this.pluginState$);
    }
    return this.pluginState$;
  }

  /**
   * Async operation to fetch state for all guides.
   * Currently only used in the example plugin.
   */
  public async fetchAllGuidesState(): Promise<{ state: GuideState[] } | undefined> {
    if (!this.isCloudEnabled) {
      return undefined;
    }
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }
    // don't send a request if a request is already in flight
    if (this.isLoading$.value) {
      return undefined;
    }

    try {
      this.isLoading$.next(true);
      const response = await this.client.get<{ state: GuideState[] }>(`${API_BASE_PATH}/guides`);
      this.isLoading$.next(false);
      return response;
    } catch (error) {
      this.isLoading$.next(false);
      throw error;
    }
  }

  /**
   * Updates the SO with the updated plugin state and refreshes the observables.
   * This is largely used internally and for tests.
   * @param {{status?: PluginStatus; guide?: GuideState}} state the updated plugin state
   * @param {boolean} panelState boolean to determine whether the dropdown panel should open or not
   * @return {Promise} a promise with the updated plugin state or undefined
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
    // don't send a request if a request is already in flight
    if (this.isLoading$.value) {
      return undefined;
    }

    try {
      this.isLoading$.next(true);
      const response = await this.client.put<{ pluginState: PluginState }>(
        `${API_BASE_PATH}/state`,
        {
          body: JSON.stringify(state),
        }
      );
      this.isLoading$.next(false);
      // update the guide state in the plugin state observable
      this.pluginState$.next(response.pluginState);
      this.isGuidePanelOpen$.next(panelState);
      return response;
    } catch (error) {
      this.isLoading$.next(false);
      throw error;
    }
  }

  /**
   * Activates a guide by guideId.
   * This is useful for the onboarding landing page, when a user selects a guide to start or continue.
   * @param {GuideId} guideId the id of the guide (one of search, kubernetes, siem)
   * @return {Promise} a promise with the updated plugin state
   */
  public async activateGuide(guideId: GuideId): Promise<{ pluginState: PluginState } | undefined> {
    if (!this.isCloudEnabled) {
      return undefined;
    }
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }
    // don't send a request if a request is already in flight
    if (this.isLoading$.value) {
      return undefined;
    }

    try {
      this.isLoading$.next(true);
      const response = await this.client.post<{ pluginState: PluginState }>(
        `${API_BASE_PATH}/guides/activate/${guideId}`
      );
      this.isLoading$.next(false);
      // update the guide state in the plugin state observable
      this.pluginState$.next(response.pluginState);
      this.isGuidePanelOpen$.next(true);
      return response;
    } catch (error) {
      this.isLoading$.next(false);
      throw error;
    }
  }

  /**
   * Marks a guide as inactive.
   * This is useful for the dropdown panel, when a user quits a guide.
   * @param {GuideState} guide the selected guide state
   * @return {Promise} a promise with the updated plugin state
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
   * Completes a guide.
   * Updates the overall guide status to 'complete', and marks it as inactive.
   * This is useful for the dropdown panel, when the user clicks the "Continue using Elastic" button after completing all steps.
   * @param {GuideId} guideId the id of the guide (one of search, kubernetes, siem)
   * @return {Promise} a promise with the updated plugin state
   */
  public async completeGuide(guideId: GuideId): Promise<{ pluginState: PluginState } | undefined> {
    const pluginState = await firstValueFrom(this.fetchPluginState$());

    // For now, returning undefined if consumer attempts to complete a guide that is not active
    if (!isGuideActive(pluginState, guideId)) return undefined;

    const { activeGuide } = pluginState!;

    // All steps should be complete at this point
    // However, we do a final check here as a safeguard
    const allStepsComplete = Boolean(activeGuide!.steps.find((step) => step.status === 'complete'));

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
   * @param {GuideId} guideId the id of the guide (one of search, kubernetes, siem)
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
   * An observable with the boolean value if the step is ready_to_complete (i.e., user needs to click the "Mark done" button).
   * Returns true, if the passed params identify the guide step that is currently ready_to_complete.
   * Returns false otherwise.
   * @param {GuideId} guideId the id of the guide (one of search, kubernetes, siem)
   * @param {GuideStepIds} stepId the id of the step in the guide
   * @return {Observable} an observable with the boolean value
   */
  public isGuideStepReadyToComplete$(guideId: GuideId, stepId: GuideStepIds): Observable<boolean> {
    return this.fetchPluginState$().pipe(
      map((pluginState) => {
        if (!isGuideActive(pluginState, guideId)) return false;
        return isStepReadyToComplete(pluginState!.activeGuide, guideId, stepId);
      })
    );
  }

  /**
   * Updates the selected step to 'in_progress' state.
   * This is useful for the dropdown panel, when the user clicks the "Start" button for the active step.
   * @param {GuideId} guideId the id of the guide (one of search, kubernetes, siem)
   * @param {GuideStepIds} stepId the id of the step
   * @return {Promise} a promise with the updated plugin state
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
   * @param {GuideId} guideId the id of the guide (one of search, kubernetes, siem)
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

    const guideConfig = await this.configService.getGuideConfig(guideId);
    const stepConfig = getStepConfig(guideConfig, activeGuide!.guideId, stepId);
    const isManualCompletion = stepConfig ? !!stepConfig.manualCompletion : false;
    const isLastStepInGuide = isLastStep(guideConfig, guideId, stepId);

    if (isCurrentStepInProgress || isCurrentStepReadyToComplete) {
      const updatedSteps = getCompletedSteps(
        activeGuide!,
        stepId,
        // if current step is in progress and configured for manual completion,
        // set the status to ready_to_complete
        isManualCompletion && isCurrentStepInProgress
      );

      const status = await this.configService.getGuideStatusOnStepCompletion({
        isLastStepInGuide,
        isManualCompletion,
        isStepReadyToComplete: isCurrentStepReadyToComplete,
      });
      const currentGuide: GuideState = {
        guideId,
        isActive: true,
        status,
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
      concatMap((state) =>
        from(this.configService.isIntegrationInGuideStep(state?.activeGuide, integration))
      )
    );
  }

  /**
   * Completes the guide step identified by the integration.
   * A noop if the active step is not configured with the passed integration.
   * @param {GuideId} integration the integration (package name) that identifies the active guide step
   * @return {Promise} a promise with the updated state or undefined if the operation fails
   */
  public async completeGuidedOnboardingForIntegration(
    integration?: string
  ): Promise<{ pluginState: PluginState } | undefined> {
    if (!integration) return undefined;
    const pluginState = await firstValueFrom(this.fetchPluginState$());
    if (!isGuideActive(pluginState)) return undefined;
    const { activeGuide } = pluginState!;
    const inProgressStepId = getInProgressStepId(activeGuide!);
    if (!inProgressStepId) return undefined;
    const isIntegrationStepActive = await this.configService.isIntegrationInGuideStep(
      activeGuide!,
      integration
    );
    if (isIntegrationStepActive) {
      return await this.completeGuideStep(activeGuide!.guideId, inProgressStepId);
    }
  }

  /**
   * Sets the plugin state to "skipped".
   * This is used on the landing page when the user clicks the button to skip the guided setup.
   * @return {Promise} a promise with the updated state or undefined if the operation fails
   */
  public async skipGuidedOnboarding(): Promise<{ pluginState: PluginState } | undefined> {
    return await this.updatePluginState({ status: 'skipped' }, false);
  }

  /**
   * Gets the config for the guide.
   * @return {Promise} a promise with the guide config or undefined if the config is not found
   */
  public async getGuideConfig(guideId: GuideId): Promise<GuideConfig | undefined> {
    if (!this.isCloudEnabled) {
      return undefined;
    }
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }
    // don't send a request if a request is already in flight
    if (this.isLoading$.value) {
      return undefined;
    }
    this.isLoading$.next(true);
    const config = await this.configService.getGuideConfig(guideId);
    this.isLoading$.next(false);
    return config;
  }
}

export const apiService = new ApiService();
