/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, map, from, concatMap, of, Observable, firstValueFrom } from 'rxjs';

import { API_BASE_PATH, getDefaultStepsStatus } from '../../common/constants';
import type { GuidesConfig, StepStatus, UseCase } from '../../common/types';
import { GuidedOnboardingState } from '../types';
import { getNextStep, isLastStep } from './helpers';

export class ApiService {
  private client: HttpSetup | undefined;
  private onboardingGuideState$!: BehaviorSubject<GuidedOnboardingState | undefined>;
  public isGuidePanelOpen$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
    this.onboardingGuideState$ = new BehaviorSubject<GuidedOnboardingState | undefined>(undefined);
  }

  /**
   * An Observable with the guided onboarding state.
   * Initially the state is fetched from the backend.
   * Subsequently, the observable is updated automatically, when the state changes.
   */
  public fetchActiveGuideState$(): Observable<GuidedOnboardingState | undefined> {
    // TODO add error handling if this.client has not been initialized or request fails
    return this.onboardingGuideState$.pipe(
      concatMap((state) =>
        state === undefined
          ? from(
              this.client!.get<{ state: GuidedOnboardingState }>(`${API_BASE_PATH}/state`, {
                query: {
                  active: true,
                },
              })
            ).pipe(
              map((response) => {
                const hasState = response.state.length > 0;
                // There should be only one active guide, so we can safely grab the first one in the array
                return hasState ? response.state[0] : undefined;
              })
            )
          : of(state)
      )
    );
  }

  public async fetchAllGuidesState(): Promise<{ state: GuidedOnboardingState } | undefined> {
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      return await this.client.get<{ state: GuidedOnboardingState }>(`${API_BASE_PATH}/state`);
    } catch (error) {
      // TODO handle error
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  public async activateGuide(
    guideConfig: GuidesConfig,
    guide?: GuidedOnboardingState
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    if (guide) {
      return await this.updateGuide(
        {
          ...guide,
          isActive: true,
        },
        true
      );
    }

    const updatedSteps = guideConfig.steps.map((step, stepIndex) => {
      const isFirstStep = stepIndex === 0;
      return {
        id: step.id,
        // Only the first step should be activated when activating a new guide
        status: isFirstStep ? 'active' : 'inactive',
      };
    });

    const updatedGuide = {
      isActive: true,
      status: 'in_progress',
      steps: updatedSteps,
      guideId: guideConfig.guideId,
    };

    return await this.updateGuide(updatedGuide, true);
  }

  public async updateGuide(
    newState: GuidedOnboardingState,
    panelState: boolean
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      const response = await this.client.put<{ state: GuidedOnboardingState }>(
        `${API_BASE_PATH}/state/${newState.guideId}`,
        {
          body: JSON.stringify(newState),
        }
      );
      this.onboardingGuideState$.next(newState);
      this.isGuidePanelOpen$.next(panelState);
      return response;
    } catch (error) {
      // TODO handle error
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  /**
   * An observable with the boolean value if the step is in progress (i.e., clicked "Start").
   * Returns true, if the passed params identify the guide step that is currently in progress.
   * Returns false otherwise.
   * @param {string} guideID the id of the guide (one of search, observability, security)
   * @param {string} stepID the id of the step in the guide
   * @return {Observable} an observable with the boolean value
   */
  public isGuideStepActive$(guideID: UseCase, stepID: string): Observable<boolean> {
    return this.fetchActiveGuideState$().pipe(
      map((activeGuideState) => {
        // Return false right away if the guide itself is not active
        if (activeGuideState.guideId !== guideID) {
          return false;
        }

        // If the guide is active, next check the step
        const selectedStep = activeGuideState.steps.find((step) => step.id === stepID);
        return selectedStep ? selectedStep.status === 'in_progress' : false;
      })
    );
  }

  public async startGuideStep(
    guideID: UseCase,
    stepID: string
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    const guideState = await firstValueFrom(this.fetchActiveGuideState$());

    const updatedSteps = guideState.steps.map((step, stepIndex) => {
      // Mark the current step as in_progress
      if (step.id === stepID) {
        return {
          id: step.id,
          status: 'in_progress',
        };
      }

      // All other steps return as-is
      return step;
    });

    const currentGuide = {
      guideId: guideID,
      isActive: true,
      status: 'in_progress',
      steps: updatedSteps,
    };

    return await this.updateGuide(currentGuide, false);
  }

  /**
   * Completes the guide step identified by the passed params.
   * A noop if the passed step is not active.
   * Completes the current guide, if the step is the last one in the guide.
   * @param {string} guideID the id of the guide (one of search, observability, security)
   * @param {string} stepID the id of the step in the guide
   * @return {Promise} a promise with the updated state or undefined if the operation fails
   */
  public async completeGuideStep(
    guideID: UseCase,
    stepID: string
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    const guideState = await firstValueFrom(this.fetchActiveGuideState$());

    // Somehow the consumer is attempting to complete a guide that isn't active
    if (guideState.guideId !== guideID) {
      return undefined;
    }

    const currentStepIndex = guideState.steps.findIndex((step) => step.id === stepID);
    const currentStep = guideState.steps[currentStepIndex];
    const isCurrentStepInProgress = currentStep ? currentStep.status === 'in_progress' : false;

    if (isCurrentStepInProgress) {
      const updatedSteps = guideState.steps.map((step, stepIndex) => {
        const isCurrentStep = step.id === currentStep!.id;
        const isNextStep = stepIndex === currentStepIndex + 1;

        // Mark the current step as complete
        if (isCurrentStep) {
          return {
            id: step.id,
            status: 'complete',
          };
        }

        // Update the next step to active status
        if (isNextStep) {
          return {
            id: step.id,
            status: 'active',
          };
        }

        // All other steps return as-is
        return step;
      });

      const currentGuide = {
        guideId: guideID,
        isActive: true,
        status: isLastStep(guideID, stepID) ? 'ready_to_complete' : 'in_progress',
        steps: updatedSteps,
      };

      return await this.updateGuide(currentGuide, true);
    }

    return undefined;
  }
}

export const apiService = new ApiService();
