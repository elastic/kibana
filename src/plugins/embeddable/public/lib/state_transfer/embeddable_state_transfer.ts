/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { cloneDeep } from 'lodash';
import { ScopedHistory, ApplicationStart } from '../../../../../core/public';
import {
  EmbeddableEditorState,
  isEmbeddableEditorState,
  EmbeddablePackageState,
  isEmbeddablePackageState,
} from './types';

/**
 * A wrapper around the state object in {@link ScopedHistory | core scoped history} which provides
 * strongly typed helper methods for common incoming and outgoing states used by the embeddable infrastructure.
 *
 * @public
 */
export class EmbeddableStateTransfer {
  constructor(
    private navigateToApp: ApplicationStart['navigateToApp'],
    private scopedHistory?: ScopedHistory
  ) {}

  /**
   * Fetches an {@link EmbeddableEditorState | originating app} argument from the scoped
   * history's location state.
   *
   * @param history - the scoped history to fetch from
   * @param options.keysToRemoveAfterFetch - an array of keys to be removed from the state after they are retrieved
   */
  public getIncomingEditorState(options?: {
    keysToRemoveAfterFetch?: string[];
  }): EmbeddableEditorState | undefined {
    return this.getIncomingState<EmbeddableEditorState>(isEmbeddableEditorState, {
      keysToRemoveAfterFetch: options?.keysToRemoveAfterFetch,
    });
  }

  /**
   * Fetches an {@link EmbeddablePackageState | embeddable package} argument from the scoped
   * history's location state.
   *
   * @param history - the scoped history to fetch from
   * @param options.keysToRemoveAfterFetch - an array of keys to be removed from the state after they are retrieved
   */
  public getIncomingEmbeddablePackage(options?: {
    keysToRemoveAfterFetch?: string[];
  }): EmbeddablePackageState | undefined {
    return this.getIncomingState<EmbeddablePackageState>(isEmbeddablePackageState, {
      keysToRemoveAfterFetch: options?.keysToRemoveAfterFetch,
    });
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with {@link EmbeddableEditorState | embeddable editor state}
   */
  public async navigateToEditor(
    appId: string,
    options?: {
      path?: string;
      state: EmbeddableEditorState;
      appendToExistingState?: boolean;
    }
  ): Promise<void> {
    await this.navigateToWithState<EmbeddableEditorState>(appId, options);
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with {@link EmbeddablePackageState | embeddable package state}
   */
  public async navigateToWithEmbeddablePackage(
    appId: string,
    options?: { path?: string; state: EmbeddablePackageState; appendToExistingState?: boolean }
  ): Promise<void> {
    await this.navigateToWithState<EmbeddablePackageState>(appId, options);
  }

  private getIncomingState<IncomingStateType>(
    guard: (state: unknown) => state is IncomingStateType,
    options?: {
      keysToRemoveAfterFetch?: string[];
    }
  ): IncomingStateType | undefined {
    if (!this.scopedHistory) {
      throw new TypeError('ScopedHistory is required to fetch incoming state');
    }
    const incomingState = this.scopedHistory.location?.state;
    const castState =
      !guard || guard(incomingState) ? (cloneDeep(incomingState) as IncomingStateType) : undefined;
    if (castState && options?.keysToRemoveAfterFetch) {
      const stateReplace = { ...(this.scopedHistory.location.state as { [key: string]: unknown }) };
      options.keysToRemoveAfterFetch.forEach((key: string) => {
        delete stateReplace[key];
      });
      this.scopedHistory.replace({ ...this.scopedHistory.location, state: stateReplace });
    }
    return castState;
  }

  private async navigateToWithState<OutgoingStateType = unknown>(
    appId: string,
    options?: { path?: string; state?: OutgoingStateType; appendToExistingState?: boolean }
  ): Promise<void> {
    const stateObject =
      options?.appendToExistingState && this.scopedHistory
        ? {
            ...(this.scopedHistory?.location.state as { [key: string]: unknown }),
            ...options.state,
          }
        : options?.state;
    await this.navigateToApp(appId, { path: options?.path, state: stateObject });
  }
}
