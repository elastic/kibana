/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { BehaviorSubject, map, from, concatMap, of, Observable, firstValueFrom } from 'rxjs';

import { API_BASE_PATH } from '../../common';
import { GuidedOnboardingState, UseCase } from '../types';
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
  public isGuideStepActive$(guideID: string, stepID: string): Observable<boolean> {
    return this.fetchGuideState$().pipe(
      map((state) => {
        return state ? state.activeGuide === guideID && state.activeStep === stepID : false;
      })
    );
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
    guideID: string,
    stepID: string
  ): Promise<{ state: GuidedOnboardingState } | undefined> {
    const isStepActive = await firstValueFrom(this.isGuideStepActive$(guideID, stepID));
    if (isStepActive) {
      if (isLastStep(guideID, stepID)) {
        await this.updateGuideState({ activeGuide: guideID as UseCase, activeStep: 'completed' });
      } else {
        const nextStepID = getNextStep(guideID, stepID);
        if (nextStepID !== undefined) {
          await this.updateGuideState({
            activeGuide: guideID as UseCase,
            activeStep: nextStepID,
          });
        }
      }
    }
    return undefined;
  }
}

export const apiService = new ApiService();
