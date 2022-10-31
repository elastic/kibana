/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, map, concatMap, of, Observable, firstValueFrom } from 'rxjs';
import type { GuideState, GuideId, GuideStep, GuideStepIds } from '@kbn/guided-onboarding';

import { GuidedOnboardingApi } from '../types';
import {
  getGuideConfig,
  getInProgressStepId,
  getStepConfig,
  getUpdatedSteps,
  isIntegrationInGuideStep,
  isLastStep,
  isStepInProgress,
  isStepReadyToComplete,
} from './helpers';
import { API_BASE_PATH } from '../../common/constants';

export class ApiService implements GuidedOnboardingApi {
  private client: HttpSetup | undefined;
  private onboardingGuideState$!: BehaviorSubject<GuideState | undefined>;
  private isGuideStateLoading: boolean | undefined;
  public isGuidePanelOpen$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
    this.onboardingGuideState$ = new BehaviorSubject<GuideState | undefined>(undefined);
  }

  private createGetStateObservable(): Observable<GuideState | undefined> {
    return new Observable<GuideState | undefined>((observer) => {
      const controller = new AbortController();
      const signal = controller.signal;
      this.isGuideStateLoading = true;
      this.client!.get<{ state: GuideState[] }>(`${API_BASE_PATH}/state`, {
        query: {
          active: true,
        },
        signal,
      })
        .then((response) => {
          this.isGuideStateLoading = false;
          // There should only be 1 active guide
          const hasState = response.state.length === 1;
          if (hasState) {
            this.onboardingGuideState$.next(response.state[0]);
          }
          observer.complete();
        })
        .catch((error) => {
          this.isGuideStateLoading = false;
          observer.error(error);
        });
      return () => {
        this.isGuideStateLoading = false;
        controller.abort();
      };
    });
  }

  /**
   * An Observable with the active guide state.
   * Initially the state is fetched from the backend.
   * Subsequently, the observable is updated automatically, when the state changes.
   */
  public fetchActiveGuideState$(): Observable<GuideState | undefined> {
    return this.onboardingGuideState$.pipe(
      concatMap((state) =>
        !state && !this.isGuideStateLoading ? this.createGetStateObservable() : of(state)
      )
    );
  }

  /**
   * Async operation to fetch state for all guides
   * This is useful for the onboarding landing page,
   * where all guides are displayed with their corresponding status
   */
  public async fetchAllGuidesState(): Promise<{ state: GuideState[] } | undefined> {
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      return await this.client.get<{ state: GuideState[] }>(`${API_BASE_PATH}/state`);
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
  public async updateGuideState(
    newState: GuideState,
    panelState: boolean
  ): Promise<{ state: GuideState } | undefined> {
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      const response = await this.client.put<{ state: GuideState }>(`${API_BASE_PATH}/state`, {
        body: JSON.stringify(newState),
      });
      // If the guide has been deactivated, we return undefined
      this.onboardingGuideState$.next(newState.isActive ? newState : undefined);
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
  ): Promise<{ state: GuideState } | undefined> {
    // If we already have the guide state (i.e., user has already started the guide at some point),
    // simply pass it through so they can continue where they left off, and update the guide to active
    if (guide) {
      return await this.updateGuideState(
        {
          ...guide,
          isActive: true,
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

      return await this.updateGuideState(updatedGuide, true);
    }
  }

  /**
   * Marks a guide as inactive
   * This is useful for the dropdown panel, when a user quits a guide
   * @param {GuideState} guide the selected guide state
   * @return {Promise} a promise with the updated guide state
   */
  public async deactivateGuide(guide: GuideState): Promise<{ state: GuideState } | undefined> {
    return await this.updateGuideState(
      {
        ...guide,
        isActive: false,
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
  public async completeGuide(guideId: GuideId): Promise<{ state: GuideState } | undefined> {
    const guideState = await firstValueFrom(this.fetchActiveGuideState$());

    // For now, returning undefined if consumer attempts to complete a guide that is not active
    if (guideState?.guideId !== guideId) {
      return undefined;
    }

    // All steps should be complete at this point
    // However, we do a final check here as a safeguard
    const allStepsComplete =
      Boolean(guideState.steps.find((step) => step.status !== 'complete')) === false;

    if (allStepsComplete) {
      const updatedGuide: GuideState = {
        ...guideState,
        isActive: false,
        status: 'complete',
      };

      return await this.updateGuideState(updatedGuide, false);
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
    return this.fetchActiveGuideState$().pipe(
      map((activeGuideState) => isStepInProgress(activeGuideState, guideId, stepId))
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
  ): Promise<{ state: GuideState } | undefined> {
    const guideState = await firstValueFrom(this.fetchActiveGuideState$());

    // For now, returning undefined if consumer attempts to start a step for a guide that isn't active
    if (guideState?.guideId !== guideId) {
      return undefined;
    }

    const updatedSteps: GuideStep[] = guideState.steps.map((step) => {
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

    return await this.updateGuideState(currentGuide, false);
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
  ): Promise<{ state: GuideState } | undefined> {
    const guideState = await firstValueFrom(this.fetchActiveGuideState$());

    // For now, returning undefined if consumer attempts to complete a step for a guide that isn't active
    if (guideState?.guideId !== guideId) {
      return undefined;
    }

    const isCurrentStepInProgress = isStepInProgress(guideState, guideId, stepId);
    const isCurrentStepReadyToComplete = isStepReadyToComplete(guideState, guideId, stepId);

    const stepConfig = getStepConfig(guideState.guideId, stepId);
    const isManualCompletion = stepConfig ? !!stepConfig.manualCompletion : false;

    if (isCurrentStepInProgress || isCurrentStepReadyToComplete) {
      const updatedSteps = getUpdatedSteps(
        guideState,
        stepId,
        // if current step is in progress and configured for manual completion,
        // set the status to ready_to_complete
        isManualCompletion && isCurrentStepInProgress
      );

      const currentGuide: GuideState = {
        guideId,
        isActive: true,
        status: isLastStep(guideId, stepId) ? 'ready_to_complete' : 'in_progress',
        steps: updatedSteps,
      };

      return await this.updateGuideState(
        currentGuide,
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
    return this.fetchActiveGuideState$().pipe(
      map((state) => {
        return state ? isIntegrationInGuideStep(state, integration) : false;
      })
    );
  }

  public async completeGuidedOnboardingForIntegration(
    integration?: string
  ): Promise<{ state: GuideState } | undefined> {
    if (integration) {
      const currentState = await firstValueFrom(this.fetchActiveGuideState$());
      if (currentState) {
        const inProgressStepId = getInProgressStepId(currentState);
        if (inProgressStepId) {
          const isIntegrationStepActive = isIntegrationInGuideStep(currentState, integration);
          if (isIntegrationStepActive) {
            return await this.completeGuideStep(currentState?.guideId, inProgressStepId);
          }
        }
      }
    }
  }
}

export const apiService = new ApiService();
