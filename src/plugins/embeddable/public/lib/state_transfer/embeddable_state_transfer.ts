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
  EmbeddableOriginatingAppState,
  isEmbeddableOriginatingAppState,
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
  constructor(private navigateToApp: ApplicationStart['navigateToApp']) {}

  /**
   * Fetches an {@link EmbeddableOriginatingAppState | originating app} argument from the scoped
   * history's location state.
   *
   * @param history - the scoped history to fetch from
   * @param removeAfterFetch - determines whether or not the state transfer service removes all keys relating to this object
   */
  public getIncomingOriginatingApp(
    history: ScopedHistory,
    removeAfterFetch: boolean = false
  ): EmbeddableOriginatingAppState | undefined {
    return this.getIncomingState<EmbeddableOriginatingAppState>(
      history,
      isEmbeddableOriginatingAppState,
      removeAfterFetch
    );
  }

  /**
   * Fetches an {@link EmbeddablePackageState | embeddable package} argument from the scoped
   * history's location state.
   *
   * @param history - the scoped history to fetch from
   * @param removeAfterFetch - determines whether or not the state transfer service removes all keys relating to this object
   */
  public getIncomingEmbeddablePackage(
    history: ScopedHistory,
    removeAfterFetch: boolean = false
  ): EmbeddablePackageState | undefined {
    return this.getIncomingState<EmbeddablePackageState>(
      history,
      isEmbeddablePackageState,
      removeAfterFetch
    );
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with {@link EmbeddableOriginatingAppState | originating app state}
   */
  public async navigateToWithOriginatingApp(
    appId: string,
    options: { path?: string; state: EmbeddableOriginatingAppState }
  ): Promise<void> {
    await this.navigateToWithState<EmbeddableOriginatingAppState>(appId, options);
  }

  /**
   * A wrapper around the {@link ApplicationStart.navigateToApp} method which navigates to the specified appId
   * with {@link EmbeddablePackageState | embeddable package state}
   */
  public async navigateToWithEmbeddablePackage(
    appId: string,
    options: { path?: string; state: EmbeddablePackageState }
  ): Promise<void> {
    await this.navigateToWithState<EmbeddablePackageState>(appId, options);
  }

  private getIncomingState<IncomingStateType>(
    history: ScopedHistory,
    guard: (state: unknown) => state is IncomingStateType,
    removeAfterFetch: boolean = false
  ): IncomingStateType | undefined {
    const incomingState = history?.location?.state;
    const castState =
      !guard || guard(incomingState) ? (cloneDeep(incomingState) as IncomingStateType) : undefined;
    if (castState && removeAfterFetch) {
      Object.keys(castState).forEach((key: string) => {
        delete (history.location.state as { [key: string]: unknown })[key];
      });
      history.push(history.location);
    }
    return castState;
  }

  private async navigateToWithState<OutgoingStateType = unknown>(
    appId: string,
    options: { path?: string; state?: OutgoingStateType }
  ): Promise<void> {
    await this.navigateToApp(appId, options);
  }
}
