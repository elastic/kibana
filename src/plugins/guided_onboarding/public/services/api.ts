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
import type { StepStatus, UseCase } from '../../common/types';
import { GuidedOnboardingState } from '../types';
import { getNextStep, isLastStep } from './helpers';

export class ApiService {
  private client: HttpSetup | undefined;
  private onboardingGuideState$!: BehaviorSubject<GuidedOnboardingState | undefined>;

  public setup(httpClient: HttpSetup): void {
    this.client = httpClient;
    this.onboardingGuideState$ = new BehaviorSubject<GuidedOnboardingState | undefined>(undefined);
  }

  /**
   * An Observable with the guided onboarding state.
   * Initially the state is fetched from the backend.
   * Subsequently, the observable is updated automatically, when the state changes.
   */
  public fetchGuideState$(): Observable<GuidedOnboardingState> {
    // TODO add error handling if this.client has not been initialized or request fails
    return this.onboardingGuideState$.pipe(
      concatMap((state) =>
        state === undefined
          ? from(this.client!.get<{ state: GuidedOnboardingState }>(`${API_BASE_PATH}/state`)).pipe(
              map((response) => response.state)
            )
          : of(state)
      )
    );
  }

  public async activateGuide(
    guideID: UseCase
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    const guidesState = await firstValueFrom(this.fetchGuideState$());

    const updatedSteps = guidesState[guideID].steps.map((step, stepIndex) => {
      const isFirstStep = stepIndex === 0;

      // Only the first step should be activated
      if (isFirstStep) {
        return {
          ...step,
          status: 'active',
        };
      }

      return step;
    });

    const updatedState = Object.keys(guidesState).reduce((acc, currentGuideId) => {
      if (currentGuideId === guideID) {
        // Mark the selected guide as active
        acc[currentGuideId] = {
          status: 'active',
          steps: updatedSteps,
        };
      } else {
        // Reset any all other guides to inactive; only 1 guide can be active at a time
        acc[currentGuideId] = {
          status: 'inactive',
          steps: [...guidesState[guideID].steps],
        };
      }
      return acc;
    }, {});

    return await this.updateGuideState(updatedState);
  }

  /**
   * Updates the state of the guided onboarding
   * @param {GuidedOnboardingState} newState the new state of the guided onboarding
   * @return {Promise} a promise with the updated state or undefined if the update fails
   */
  public async updateGuideState(
    newState: GuidedOnboardingState
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    if (!this.client) {
      throw new Error('ApiService has not be initialized.');
    }

    try {
      const response = await this.client.put<{ state: GuidedOnboardingState }>(
        `${API_BASE_PATH}/state`,
        {
          body: JSON.stringify(newState),
        }
      );
      this.onboardingGuideState$.next(newState);
      return response;
    } catch (error) {
      // TODO handle error
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  /**
   * An observable with the boolean value if the step is active.
   * Returns true, if the passed params identify the guide step that is currently active.
   * Returns false otherwise.
   * @param {string} guideID the id of the guide (one of search, observability, security)
   * @param {string} stepID the id of the step in the guide
   * @return {Observable} an observable with the boolean value
   */
  public isGuideStepActive$(guideID: UseCase, stepID: string): Observable<boolean> {
    return this.fetchGuideState$().pipe(
      map((state) => {
        const selectedGuide = state[guideID];
        const selectedStep = selectedGuide.steps.find((step) => step.id === stepID);
        return selectedStep ? selectedStep.status === 'in_progress' : false;
      })
    );
  }

  public async startGuideStep(
    guideID: UseCase,
    stepID: string
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    const guidesState = await firstValueFrom(this.fetchGuideState$());
    const currentGuide = guidesState[guideID];

    const updatedSteps = currentGuide.steps.map((step, stepIndex) => {
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

    const updatedState = {
      ...guidesState,
      [guideID]: {
        status: 'in_progress',
        steps: updatedSteps,
      },
    };

    return await this.updateGuideState(updatedState);
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
    const guidesState = await firstValueFrom(this.fetchGuideState$());

    // TODO update helpers file
    const currentGuide = guidesState[guideID];
    const currentStepIndex = currentGuide.steps.findIndex((step) => step.id === stepID);
    const currentStep = currentGuide.steps[currentStepIndex];
    const isCurrentStepInProgress = currentStep ? currentStep.status === 'in_progress' : false;

    if (isCurrentStepInProgress) {
      const updatedSteps = currentGuide.steps.map((step, stepIndex) => {
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

      const updatedState = {
        ...guidesState,
        [guideID]: {
          status: isLastStep(guideID, stepID) ? 'ready_to_complete' : 'in_progress',
          steps: updatedSteps,
        },
      };

      await this.updateGuideState(updatedState);
    }

    return undefined;
  }
}

export const apiService = new ApiService();
